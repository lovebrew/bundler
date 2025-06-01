use std::io::Cursor;
use ttf_parser::Face;

use crate::types::error::FontError;

pub struct Font;

impl Font {
    pub fn from_bytes(bytes: &[u8]) -> Result<Option<Self>, FontError> {
        if bytes.is_empty() {
            return Err(FontError::CorruptedData);
        }

        match Face::parse(bytes, 0) {
            Ok(_) => Ok(Some(Font)),
            Err(_) => Err(FontError::ParseFailure),
        }
    }
}
