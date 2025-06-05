use anyhow::Result;
use log::error;
use rocket::form::{Form, FromForm};
use rocket::fs::TempFile;
use rocket::futures::future::join_all;
use rocket::http::{ContentType, Status};
use rocket::tokio::fs;
use rocket::tokio::io::AsyncReadExt;

use crate::models::response::Response;
use crate::traits::processable::Processable;
use crate::types::error::AppError;
use crate::types::font::Font;
use crate::types::texture::Texture;
use crate::types::zipfile::ZipFile;
use crate::utilities::tracefile::Tracefile;

#[derive(FromForm)]
pub struct FormData<'f> {
    files: Vec<TempFile<'f>>,
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

    let tasks = form.files.iter_mut().map(|file| {
        let filename = file.name().map(str::to_string);

        let dir_path = dir_path.clone();
        let trace = trace_file.clone();

        async move {
            let name = match &filename {
                Some(name) => name.clone(),
                None => return None,
            };
            trace.info(format!("Processing file '{name}'"));

            let buffer = match read_form_file(file).await {
                Ok(buffer) => buffer,
                Err(e) => {
                    error!("Failed to read file {name}: {e}");
                    return None;
                }
            };

            let asset = match validate_form_file(buffer) {
                Ok(asset) => asset,
                Err(e) => {
                    trace.error(format!("Failed to process file '{name}': {e}"));
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
                Err(e) => {
                    trace.error(format!("Cannot convert {filepath:?}: {e}"));
                    return None;
                }
            };

            let rel_path = filepath.strip_prefix(&dir_path).ok()?.with_extension(ext);
            let out_file = rel_path.to_string_lossy().to_string();

            trace.info(format!("Converted {name} -> {out_file:?}"));
            Some((out_file, bytes))
        }
    });

    let results = join_all(tasks).await;
    let partial = results.iter().any(|v| v.is_none());

    if partial {
        let error_count = results.iter().filter(|v| v.is_none()).count();
        trace_file.info(format!("Conversion finished with {error_count} errors."));
    }

    for result in results.iter().flatten() {
        let (out_file, bytes) = result;
        zip_file.add_file(out_file, bytes).map_err(|e| {
            error!("Cannot add {out_file} to zip file: {e}");
            AppError::Internal
        })?;
    }

    if let Ok(bytes) = trace_file.bytes() {
        zip_file.add_file("convert.log", &bytes).map_err(|e| {
            error!("Cannot add convert.log: {e}");
            AppError::Internal
        })?;
    }

    Ok(Response::with_status(
        zip_file,
        if partial {
            Status::PartialContent
        } else {
            Status::Ok
        },
    ))
}
