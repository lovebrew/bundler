use anyhow::Result;

use crate::models::query::Metadata;

pub trait Binary {
    fn create_metadata(&self, metadata: &Metadata) -> Result<()>;
    fn process(&self, metadata: &Metadata) -> Result<Vec<u8>>;
}
