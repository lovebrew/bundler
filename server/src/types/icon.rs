use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::LazyLock;

use axum::body::Bytes;
use image::{GenericImageView, ImageFormat};

use crate::enums::api_error::ApiError;
use crate::enums::console::Console;
use crate::modules::filesystem;

static ICON_DATA: LazyLock<HashMap<Console, u32>> = LazyLock::new(|| {
    HashMap::from([
        (Console::Ctr, 48),
        (Console::Hac, 256),
        (Console::Cafe, 128),
    ])
});

pub struct Icon {
    pub filepath: String,
}

impl Icon {
    pub async fn new(
        console: Console,
        contents: &Bytes,
        filepath: &PathBuf,
    ) -> Result<Self, ApiError> {
        let size = ICON_DATA[&console];

        if let Ok(img) = image::load_from_memory(contents) {
            let (width, height) = img.dimensions();
            if width != size && height != size {
                return Err(ApiError::validation_error(
                    "dimensions",
                    format!(
                        "Icon must be {}x{} pixels for {}. Got: {}x{}",
                        size,
                        size,
                        console.full_name(),
                        width,
                        height
                    ),
                ));
            }

            let format = image::guess_format(&contents).map_err(|_e| {
                ApiError::validation_error("format", "Failed to guess image format".to_string())
            })?;

            if ((format != ImageFormat::Png)
                && (console == Console::Ctr || console == Console::Cafe))
                || (format != ImageFormat::Jpeg && console == Console::Hac)
            {
                let expected = if console == Console::Ctr || console == Console::Cafe {
                    "PNG"
                } else {
                    "JPEG"
                };

                return Err(ApiError::validation_error(
                    "format",
                    format!(
                        "Icon must be in {} format for {}. Got: {:?}",
                        expected,
                        console.full_name(),
                        format
                    ),
                ));
            }
        } else {
            return Err(ApiError::ServerError("Failed to read image".to_string()));
        }

        filesystem::save_file(contents, filepath).await?;

        Ok(Self {
            filepath: filesystem::normalize_path(filepath),
        })
    }

    pub fn get_filepath(&self) -> String {
        self.filepath.clone()
    }
}
