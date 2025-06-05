use anyhow::Result;
use rocket::http::Status;
use std::io::{Cursor, Write};
use zip::{CompressionMethod, ZipWriter, write::FileOptions};

pub struct ZipFile<'a> {
    writer: ZipWriter<Cursor<Vec<u8>>>,
    compression: FileOptions<'a, ()>,
}

impl<'a> ZipFile<'a> {
    pub fn new() -> Self {
        let cursor = Cursor::new(Vec::new());
        let writer = ZipWriter::new(cursor);

        let options = FileOptions::<()>::default();
        let compression = options.compression_method(CompressionMethod::Stored);

        Self {
            writer,
            compression,
        }
    }

    pub fn add_file(&mut self, name: &str, data: &[u8]) -> Result<()> {
        self.writer.start_file(name, self.compression)?;
        self.writer.write_all(data)?;
        Ok(())
    }

    pub fn finish(self) -> Result<Vec<u8>> {
        let cursor = self.writer.finish().map_err(|_| AppError::Internal)?;
        Ok(cursor.into_inner())
    }
}

use rocket::http::ContentType;
use rocket::response::Responder;

use crate::types::error::AppError;

impl<'a, 'r, 'o: 'r> Responder<'r, 'o> for ZipFile<'a> {
    fn respond_to(self, _request: &'r rocket::Request<'_>) -> rocket::response::Result<'o> {
        // Finish the zip writer to flush all data and get the inner cursor
        let cursor = self
            .writer
            .finish()
            .map_err(|_| Status::InternalServerError)?;

        let bytes = cursor.into_inner();

        Ok(rocket::Response::build()
            .header(ContentType::new("application", "zip"))
            .sized_body(bytes.len(), Cursor::new(bytes))
            .finalize())
    }
}
