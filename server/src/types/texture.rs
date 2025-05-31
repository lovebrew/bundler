use std::path::PathBuf;

use axum::body::Bytes;
use image::ImageReader;
use image::{self, GenericImageView};
use tokio::process;

use crate::enums::api_error::ApiError;
use crate::modules::filesystem;
use crate::traits::convertible::Convertible;

use std::io::Cursor;

pub struct Texture {
    filepath: String,
    output_path: String,
}

const PROGRAM_PATH: &str = "tex3ds";
const PROGRAM_ARGS: [&str; 4] = ["--format", "rgba8", "-z", "auto"];

impl Convertible for Texture {
    async fn convert(&self) -> Result<(String, String), ApiError> {
        let result = process::Command::new(PROGRAM_PATH)
            .args(PROGRAM_ARGS)
            .args([&self.filepath, "-o", &self.output_path])
            .output()
            .await;

        if let Ok(output) = result {
            if !output.status.success() {
                return Err(ApiError::ConversionError(format!(
                    "Failed to convert '{}' to '{}': {}",
                    self.filepath,
                    self.output_path,
                    String::from_utf8_lossy(&output.stderr),
                )));
            }
        }

        Ok((
            filesystem::get_filename(&self.output_path),
            filesystem::read_file_as_base64(&self.output_path).await?,
        ))
    }
}

impl Texture {
    pub async fn new(contents: &Bytes, filepath: &PathBuf) -> Result<Option<Texture>, ApiError> {
        let filename = filesystem::get_filename(filepath);

        let formats = [image::ImageFormat::Png, image::ImageFormat::Jpeg];

        for format in formats.iter() {
            let reader = ImageReader::with_format(Cursor::new(contents), *format);
            if let Ok(img) = reader.decode() {
                let (width, height) = img.dimensions();
                if !Texture::is_within_dimensions(width, height) {
                    return Err(ApiError::validation_error(
                        "dimensions",
                        format!(
                            "Texture '{}' must be (3..=1024)x(3..=1024) pixels. Got: {}x{}",
                            filename, width, height
                        ),
                    ));
                }

                filesystem::save_file(contents, filepath).await?;

                return Ok(Some(Texture {
                    filepath: filesystem::normalize_path(filepath),
                    output_path: filesystem::normalize_path(filepath.with_extension("t3x")),
                }));
            }
        }

        Ok(None)
    }

    fn is_within_dimensions(width: u32, height: u32) -> bool {
        (3..=1024).contains(&width) && (3..=1024).contains(&height)
    }
}
