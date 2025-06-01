use anyhow::Result;
use log::error;
use rocket::form::{Form, FromForm};
use rocket::fs::TempFile;
use rocket::tokio::io::AsyncReadExt;

use crate::types::error::AppError;
use crate::types::font::Font;
use crate::types::texture::Texture;

#[derive(FromForm)]
pub struct FormData<'f> {
    files: Vec<TempFile<'f>>,
}

enum Asset {
    Texture(Texture),
    Font(Font),
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

fn process_file(name: &str, buffer: Vec<u8>) -> Result<Asset, AppError> {
    if let Some(texture) = Texture::from_bytes(&name, &buffer)? {
        return Ok(Asset::Texture(texture));
    }
    if let Some(font) = Font::from_bytes(&buffer)? {
        return Ok(Asset::Font(font));
    }
    Err(AppError::InvalidFormat("Unsupported file format"))
}

/// Handles file conversion requests.
/// Any file that is not a valid texture or font will be skipped.
/// The files are processed in a temporary directory, and errors are logged but do not stop the processing of other files.
#[post("/convert", format = "multipart/form-data", data = "<form>")]
pub async fn convert(mut form: Form<FormData<'_>>) -> Result<(), AppError> {
    let directory = tempfile::tempdir().expect("Failed to create temp directory");

    for file in form.files.iter_mut() {
        let buffer = match read_form_file(file).await {
            Ok(buffer) => buffer,
            Err(e) => {
                error!("Failed to read file: {e}");
                continue;
            }
        };

        let name = match file.name() {
            Some(name) => name.to_string(),
            None => continue,
        };

        let asset = match process_file(&name, buffer) {
            Ok(asset) => asset,
            Err(e) => {
                error!("Failed to process file {name}: {e}");
                continue;
            }
        };

        let filepath = directory.path().join(&name);
        if let Err(e) = file.persist_to(&filepath).await {
            error!("Failed to save file {name}: {e}");
            continue;
        }
        // TODO: process the file via threads
        println!("Processed file: {name}");
    }
    Ok(())
}
