use core::error;

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

enum Asset {
    Texture(Texture),
    Font(Font),
}

#[post("/convert", format = "multipart/form-data", data = "<form>")]
pub async fn convert(mut form: Form<FormData<'_>>) -> Result<(), AppError> {
    let directory = tempfile::tempdir().expect("Failed to create temp directory");

    for file in form.files.iter_mut() {
        let buffer = read_form_file(file).await?;
        // TODO: load texture or font
        let name = match file.name() {
            Some(name) => name.to_string(),
            None => continue,
        };
        let filepath = directory.path().join(&name);
        if let Err(e) = file.persist_to(&filepath).await {
            error!("Failed to save file {name}: {e}");
            continue;
        }
        // TODO: process the file via threads
    }
    Ok(())
}
