use anyhow::Result;
use std::path::Path;

pub trait Processable {
    fn process(&self, filepath: &Path) -> Result<(&str, Vec<u8>)>;
}
