use std::path::Path;

use crate::enums::api_error::ApiError;
use crate::enums::console::Console;
use crate::modules::filesystem;
use crate::traits::binary::Binary;
use crate::types::bundler_query::Metadata;

pub struct Ctr {}

const METADATA_TOOL: &str = "smdhtool";
const BINARY_TOOL: &str = "3dsxtool";

impl Binary for Ctr {
    async fn compile(
        basepath: &Path,
        metadata: &Metadata,
        icon: &String,
    ) -> Result<String, ApiError> {
        let output_path = filesystem::normalize_path(basepath);
        let description = format!("{} - {}", metadata.description, metadata.version);

        if metadata.title.encode_utf16().count() > 0x40 {
            return Err(ApiError::server_error("Title is too long".to_string()));
        }

        if description.encode_utf16().count() > 0x80 {
            return Err(ApiError::server_error(
                "Description is too long".to_string(),
            ));
        }

        if metadata.author.encode_utf16().count() > 0x40 {
            return Err(ApiError::server_error("Author is too long".to_string()));
        }

        Self::run_command(
            METADATA_TOOL,
            &[
                "--create",
                &metadata.title,
                &description,
                &metadata.author,
                &icon,
                &format!("{}.smdh", output_path),
            ],
        )
        .await?;

        let binary_path = Console::Ctr.get_binary();

        Self::run_command(
            BINARY_TOOL,
            &[
                &binary_path,
                &format!("{}.3dsx", output_path),
                &format!("--smdh={}.smdh", output_path),
                &format!("--romfs={}", Console::Ctr.get_romfs()),
            ],
        )
        .await?;

        let base64 = filesystem::read_file_as_base64(&format!("{}.3dsx", output_path)).await?;

        Ok(base64)
    }
}
