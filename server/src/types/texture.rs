use image::{GenericImageView, ImageFormat, ImageReader};
use std::io::Cursor;

use crate::types::error::{AppError, TextureError};

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

    pub fn from_bytes(name: &str, bytes: &[u8]) -> Result<Option<Self>, TextureError> {
        if bytes.is_empty() {
            return Err(TextureError::CorruptedData);
        }

        for format in FORMATS.iter() {
            let reader = ImageReader::with_format(Cursor::new(bytes), *format);
            if let Ok(img) = reader.decode() {
                return Self::validate_image(img);
            }
            return Err(TextureError::UnsupportedFormat {
                format: format!("{:?}", format),
                name: name.to_string(),
            });
        }
        Ok(None)
    }
}
