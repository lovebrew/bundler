use std::path::PathBuf;

use image::{DynamicImage, ImageFormat};

use crate::{models::target::Target, types::apierror::IconError};

#[derive(Debug)]
pub struct Icon {
    image: DynamicImage,
    format: ImageFormat,
}

impl Icon {
    pub fn from_bytes(target: &Target, bytes: &[u8]) -> Result<Self, IconError> {
        let mut image = image::load_from_memory(bytes).map_err(|_| IconError::CorruptedData)?;
        let ((width, height), format) = match target {
            Target::Ctr => ((48, 48), ImageFormat::Png),
            Target::Hac => ((256, 256), ImageFormat::Jpeg),
            Target::Cafe => ((128, 128), ImageFormat::Png),
        };
        image = image.thumbnail(width, height);
        if format == ImageFormat::Jpeg {
            image = DynamicImage::ImageRgb8(image.to_rgb8());
        }
        Ok(Self { image, format })
    }

    pub fn create(&self, path: &PathBuf) -> Result<(), IconError> {
        self.image
            .save_with_format(path, self.format)
            .map_err(|e| IconError::CouldNotCreate {
                message: e.to_string(),
            })
    }
}
