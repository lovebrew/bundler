use ttf_parser::Face;

use std::path::Path;

use crate::types::apierror::AppError;
use crate::{traits::processable::Processable, types::apierror::FontError};

pub struct Font;

impl Font {
    pub fn from_bytes(bytes: &[u8]) -> Result<Option<Self>, FontError> {
        if bytes.is_empty() {
            return Err(FontError::CorruptedData);
        }
        match Face::parse(bytes, 0) {
            Ok(_) => Ok(Some(Font)),
            Err(_) => Ok(None),
        }
    }
}

use anyhow::Result;
use std::process::Command;

const EXECUTABLE: &str = "mkbcfnt";

impl Processable for Font {
    fn process(&self, filepath: &Path) -> Result<(&str, Vec<u8>)> {
        let out_file = filepath.with_extension("bcfnt");
        let mut command = Command::new(EXECUTABLE);
        command.arg(filepath).arg("-o").arg(&out_file);

        match command.output() {
            Ok(output) => {
                if !output.status.success() {
                    return Err(AppError::FailedToExecute(EXECUTABLE).into());
                }
                let bytes = std::fs::read(out_file)?;
                Ok(("bcfnt", bytes))
            }
            Err(_) => Err(AppError::FailedToExecute(EXECUTABLE).into()),
        }
    }
}
