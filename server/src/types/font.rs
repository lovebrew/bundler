use std::path::PathBuf;

use axum::body::Bytes;
use tokio::process;
use ttf_parser::Face;

use crate::enums::api_error::ApiError;
use crate::modules::filesystem;
use crate::traits::convertible::Convertible;

pub struct Font {
    filepath: String,
    output_path: String,
}

const PROGRAM_PATH: &str = "mkbcfnt";

impl Convertible for Font {
    async fn convert(&self) -> Result<(String, String), ApiError> {
        let result = process::Command::new(PROGRAM_PATH)
            .args([&self.filepath, "-o", &self.output_path])
            .output()
            .await;

        if let Ok(output) = result {
            if !output.status.success() {
                return Err(ApiError::ConversionError(format!(
                    "Failed to convert '{}' to '{}': {}",
                    self.filepath,
                    self.output_path,
                    String::from_utf8_lossy(&output.stderr)
                )));
            }
        }

        Ok((
            filesystem::get_filename(&self.output_path),
            filesystem::read_file_as_base64(&self.output_path).await?,
        ))
    }
}

impl Font {
    pub async fn new(contents: &Bytes, filepath: &PathBuf) -> Result<Option<Font>, ApiError> {
        match Face::parse(contents, 0) {
            Ok(_) => {
                filesystem::save_file(contents, filepath).await?;

                Ok(Some(Font {
                    filepath: filesystem::normalize_path(filepath),
                    output_path: filesystem::normalize_path(filepath.with_extension("bcfnt")),
                }))
            }
            Err(_) => Ok(None),
        }
    }
}
