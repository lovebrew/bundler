use std::path::Path;

use crate::enums::api_error::ApiError;
use crate::enums::console::Console;
use crate::modules::filesystem;
use crate::traits::binary::Binary;
use crate::types::bundler_query::Metadata;

pub struct Cafe {}

const RPL_TOOL: &str = "elf2rpl";
const BINARY_TOOL: &str = "wuhbtool";

impl Binary for Cafe {
    async fn compile(
        basepath: &Path,
        metadata: &Metadata,
        icon: &String,
    ) -> Result<String, ApiError> {
        let output_path = filesystem::normalize_path(basepath);
        let binary_path = Console::Hac.get_binary();

        Self::run_command(RPL_TOOL, &[&binary_path, &format!("{}.rpx", output_path)]).await?;

        Self::run_command(
            BINARY_TOOL,
            &[
                &format!("{}.rpx", output_path),
                &format!("{}.wuhb", output_path),
                &format!("--content={}", Console::Cafe.get_romfs()),
                &format!("--name={}", metadata.title),
                &format!("--short-name={}", metadata.title),
                &format!("--author={}", metadata.author),
                &format!("--icon={}", icon),
            ],
        )
        .await?;

        let base64 = filesystem::read_file_as_base64(&format!("{}.wuhb", output_path)).await?;

        Ok(base64)
    }
}
