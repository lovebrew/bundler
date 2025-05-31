use std::collections::HashMap;
use std::path::{Path, PathBuf};

use axum::extract::Multipart;
use axum::{
    body::Bytes,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tempfile::tempdir;
use tokio::{task, task::JoinHandle};

use crate::common::logger::MemoryLogger;
use crate::enums::api_error::ApiError;
use crate::traits::convertible::Convertible;
use crate::types::font::Font;
use crate::types::texture::Texture;

fn spawn_conversion_task(
    save_path: PathBuf,
    contents: Bytes,
) -> JoinHandle<Result<(String, String), ApiError>> {
    task::spawn(async move {
        if let Some(texture) = Texture::new(&contents, &save_path).await? {
            texture.convert().await
        } else if let Some(font) = Font::new(&contents, &save_path).await? {
            font.convert().await
        } else {
            // None should never happen
            let filename = match save_path.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => return Err(ApiError::ServerError("Failed to get filename".to_string())),
            };

            return Err(ApiError::UnsupportedMediaType(format!(
                "Unsupported file: '{}'. Expected a PNG/JPEG texture or TTF/OTF font.",
                filename
            )));
        }
    })
}

async fn process_multipart_files(
    multipart: &mut Multipart,
    directory: &Path,
    logger: &mut MemoryLogger,
) -> Result<Vec<JoinHandle<Result<(String, String), ApiError>>>, ApiError> {
    let mut tasks = Vec::<JoinHandle<Result<(String, String), ApiError>>>::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let filename = match &field.file_name() {
            Some(name) => String::from(*name),
            None => continue,
        };

        logger.info(&format!("Processing file: {}", filename));

        let contents = field
            .bytes()
            .await
            .map_err(|e| ApiError::BadRequest(e.to_string()))?;

        if contents.is_empty() {
            logger.error(&format!("Cannot process {}: empty file", filename));
            continue;
        }

        let save_path = directory.join(&filename);
        tasks.push(spawn_conversion_task(save_path, contents));
    }

    if tasks.is_empty() {
        return Err(ApiError::BadRequest("No files to convert".to_string()));
    }

    Ok(tasks)
}

pub async fn convert_handler(mut multipart: Multipart) -> Result<Response, ApiError> {
    let mut hashmap = HashMap::<String, String>::new();
    let mut logger = MemoryLogger::new();

    let mut had_errors = false;

    let directory = tempdir().map_err(|e| ApiError::server_error(e.to_string()))?;
    let save_directory = directory.path();

    let tasks = process_multipart_files(&mut multipart, save_directory, &mut logger).await?;

    for task in tasks {
        match task.await {
            Ok(Ok((filename, encoded))) => {
                hashmap.insert(filename, encoded);
            }
            Ok(Err(e)) => {
                logger.error(&e.error_response().message);
                had_errors = true;
            }
            Err(_) => had_errors = true,
        }
    }

    hashmap.insert(String::from("log"), logger.get_logs());

    let code = if had_errors {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };

    Ok((code, axum::Json(hashmap)).into_response())
}
