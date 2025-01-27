use std::path::PathBuf;

use axum::body::Bytes;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use log::error;

use crate::enums::api_error::ApiError;

pub async fn save_file(content: &Bytes, filepath: &PathBuf) -> Result<(), ApiError> {
    if let Some(parent) = filepath.parent() {
        if !parent.exists() && parent != PathBuf::from("") {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return Err(ApiError::server_error(e.to_string()));
            }
        }
    }

    if let Err(e) = tokio::fs::write(&filepath, &content).await {
        return Err(ApiError::server_error(e.to_string()));
    }

    Ok(())
}

pub async fn read_file_as_base64(path: &String) -> Result<String, ApiError> {
    let file = match tokio::fs::read(path).await {
        Ok(file) => file,
        Err(e) => {
            error!("Error reading file: {:?}", e);
            return Err(ApiError::server_error(e.to_string()));
        }
    };

    Ok(STANDARD.encode(&file))
}

pub fn normalize_path(path: impl AsRef<std::path::Path>) -> String {
    path.as_ref().to_string_lossy().replace("\\", "/")
}

pub fn get_filename(path: impl AsRef<std::path::Path>) -> String {
    match path.as_ref().file_name() {
        Some(filename) => filename.to_string_lossy().to_string(),
        None => String::new(),
    }
}
