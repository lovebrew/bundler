use std::path::Path;

use log::error;
use tokio::process::Command;

use crate::enums::api_error::ApiError;
use crate::types::bundler_query::Metadata;

pub trait Binary {
    async fn run_command(program: &str, args: &[&str]) -> Result<(), ApiError> {
        let mut command = Command::new(program);
        command.args(args);

        let output = command
            .output()
            .await
            .map_err(|e| ApiError::ServerError(e.to_string()))?;

        if !output.status.success() {
            error!(
                "Failed to run command: {}",
                String::from_utf8_lossy(&output.stderr)
            );
            return Err(ApiError::ServerError("Failed to run command".to_string()));
        }

        Ok(())
    }

    async fn compile(
        basepath: &Path,
        metadata: &Metadata,
        icon: &String,
    ) -> Result<String, ApiError>;
}
