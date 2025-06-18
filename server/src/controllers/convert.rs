use std::path::PathBuf;

use anyhow::Result;
use log::error;
use rocket::form::{Form, FromForm};
use rocket::fs::TempFile;
use rocket::futures::future::join_all;
use rocket::http::Status;
use rocket::tokio::fs;
use rocket::tokio::io::AsyncReadExt;

use crate::logging::message::Message;
use crate::logging::tracefile::Tracefile;
use crate::models::response::Response;
use crate::traits::processable::Processable;
use crate::types::apierror::AppError;
use crate::types::font::Font;
use crate::types::texture::Texture;
use crate::types::zipfile::ZipFile;

#[derive(FromForm)]
pub struct FormData<'f> {
    files: Vec<TempFile<'f>>,
    paths: Vec<String>,
}

async fn read_form_file(file: &TempFile<'_>) -> Result<Vec<u8>, AppError> {
    let mut buffer = vec![];
    let name = match &file.name() {
        Some(name) => name.to_string(),
        None => return Err(AppError::Internal),
    };
    let mut file = file.open().await.map_err(|e| {
        error!("Failed to open file: {name} ({e:?})");
        AppError::Internal
    })?;
    file.read_to_end(&mut buffer).await.map_err(|e| {
        error!("Failed to read file: {name} ({e:?})");
        AppError::Internal
    })?;
    Ok(buffer)
}

fn validate_form_file(buffer: Vec<u8>) -> Result<Box<dyn Processable + Send>, AppError> {
    match Texture::from_bytes(&buffer) {
        Ok(Some(texture)) => return Ok(Box::new(texture)),
        Ok(None) => {}
        Err(e) => return Err(AppError::Texture(e)),
    }
    match Font::from_bytes(&buffer) {
        Ok(Some(font)) => return Ok(Box::new(font)),
        Ok(None) => {}
        Err(e) => return Err(AppError::Font(e)),
    }
    Err(AppError::InvalidFormat("Unsupported file format"))
}

/// Handles file conversion requests.
/// Any file that is not a valid texture or font will be skipped.
/// The files are processed in a temporary directory, and errors are logged but do not stop the processing of other files.
/// A Tracefile is attached to the resulting zip for end-users.
#[post("/convert", format = "multipart/form-data", data = "<form>")]
pub async fn convert(mut form: Form<FormData<'_>>) -> Result<Response, AppError> {
    let directory = tempfile::tempdir().expect("Failed to create temp directory");
    let dir_path = directory.path().to_owned();

    let mut zip_file = ZipFile::new();
    let trace_file = Tracefile::new();

    let FormData { files, paths } = &mut *form;
    let tasks = files.iter_mut().zip(paths).map(|(file, rel_path_str)| {
        let rel_path = PathBuf::from(&*rel_path_str);
        let filename = match file.name() {
            Some(name) => rel_path.join(name).to_str().map(str::to_string),
            None => None,
        };

        let dir_path = dir_path.clone();
        let trace = trace_file.clone();

        async move {
            let name = match filename {
                Some(name) => name.clone(),
                None => return None,
            };
            trace.info(Message::Processing(&name)).await;

            let buffer = match read_form_file(file).await {
                Ok(buffer) => buffer,
                Err(e) => {
                    error!("Failed to read file {name}: {e}");
                    return None;
                }
            };

            let asset = match validate_form_file(buffer) {
                Ok(asset) => asset,
                Err(reason) => {
                    trace.error(Message::FailedToProcess(&name, reason)).await;
                    return None;
                }
            };

            let filepath = dir_path.join(&name);
            if let Some(parent) = filepath.parent() {
                if let Err(e) = fs::create_dir_all(parent).await {
                    error!("Failed to create directories: {e}");
                    return None;
                }
            }

            if let Err(e) = file.persist_to(&filepath).await {
                error!("Failed to save file {name}: {e}");
                return None;
            }

            let (ext, bytes) = match asset.process(&filepath) {
                Ok(data) => data,
                Err(_) => {
                    trace.error(Message::CannotConvert(&name)).await;
                    return None;
                }
            };

            let rel_path = filepath.strip_prefix(&dir_path).ok()?.with_extension(ext);
            let out_file = rel_path.to_string_lossy().to_string();

            trace.info(Message::Converted(&name, &out_file)).await;
            Some((out_file, bytes))
        }
    });

    let results: Vec<Option<(String, Vec<u8>)>> = join_all(tasks).await;

    let (oks, errs): (Vec<_>, Vec<_>) = results.into_iter().partition(|res| res.is_some());
    let (is_partial, count) = (!errs.is_empty(), errs.len());

    if is_partial {
        trace_file.info(Message::FinishedWithErrors(count)).await;
    }

    for (out_file, bytes) in oks.into_iter().flatten() {
        zip_file.try_add_file(&out_file, &bytes)?;
    }

    let status = if is_partial {
        Status::PartialContent
    } else {
        Status::Ok
    };

    if let Ok(bytes) = trace_file.bytes().await {
        zip_file.try_add_file("convert.log", &bytes)?;
    }

    Ok(Response::with_status(zip_file, status))
}
