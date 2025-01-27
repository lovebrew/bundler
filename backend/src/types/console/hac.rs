use std::path::Path;

use crate::enums::api_error::ApiError;
use crate::enums::console::Console;
use crate::modules::filesystem;
use crate::traits::binary::Binary;
use crate::types::bundler_query::Metadata;

pub struct Hac {}

const METADATA_TOOL: &str = "nacptool";
const BINARY_TOOL: &str = "elf2nro";

impl Binary for Hac {
    async fn compile(
        basepath: &Path,
        metadata: &Metadata,
        icon: &String,
    ) -> Result<String, ApiError> {
        let output_path = filesystem::normalize_path(basepath);

        Self::run_command(
            METADATA_TOOL,
            &[
                "--create",
                &metadata.title,
                &metadata.author,
                &metadata.version,
                &format!("{}.smdh", output_path),
            ],
        )
        .await?;

        let binary_path = Console::Hac.get_binary();

        Self::run_command(
            BINARY_TOOL,
            &[
                &binary_path,
                &format!("{}.nro", output_path),
                &format!("--icon={}", icon),
                &format!("--nacp={}.nacp", output_path),
                &format!("--romfs={}", Console::Hac.get_romfs()),
            ],
        )
        .await?;

        let base64 = filesystem::read_file_as_base64(&format!("{}.nro", output_path)).await?;

        Ok(base64)
    }
}
