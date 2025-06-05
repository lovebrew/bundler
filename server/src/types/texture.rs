use image::{GenericImageView, ImageFormat, ImageReader};
use std::io::Cursor;
use std::path::Path;

use crate::traits::processable::Processable;
use crate::types::error::TextureError;

pub struct Texture;

const FORMATS: [ImageFormat; 2] = [ImageFormat::Png, ImageFormat::Jpeg];

impl Texture {
    fn validate_image(img: image::DynamicImage) -> Result<Option<Self>, TextureError> {
        let (width, height) = img.dimensions();
        let within_bounds = (3..=1024).contains(&width) && (3..=1024).contains(&height);

        if !within_bounds {
            return Err(TextureError::OutOfBounds { width, height });
        }
        Ok(Some(Texture))
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Option<Self>, TextureError> {
        if bytes.is_empty() {
            return Err(TextureError::CorruptedData);
        }
        for format in FORMATS.iter() {
            let reader = ImageReader::with_format(Cursor::new(bytes), *format);
            if let Ok(img) = reader.decode() {
                return Self::validate_image(img);
            }
        }
        Ok(None)
    }
}

const EXECUTABLE: &str = "tex3ds";
const ARGS: [&str; 2] = ["-f", "rgba"];

use anyhow::{Result, anyhow};
use std::process::Command;

impl Processable for Texture {
    fn process(&self, filepath: &Path) -> Result<(&str, Vec<u8>)> {
        let out_file = filepath.with_extension("t3x");
        let mut command = Command::new(EXECUTABLE);
        command.args(ARGS).arg(filepath).arg("-o").arg(&out_file);

        match command.output() {
            Ok(output) => {
                if !output.status.success() {
                    return Err(anyhow!("{}", String::from_utf8_lossy(&output.stderr)));
                }
                let bytes = std::fs::read(out_file)?;
                Ok(("t3x", bytes))
            }
            Err(e) => Err(anyhow::anyhow!("Failed to execute {}: {}", EXECUTABLE, e)),
        }
    }
}
