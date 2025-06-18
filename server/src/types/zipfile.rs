use anyhow::Result;
use rocket::http::Status;
use std::io::{Cursor, Write};
use zip::{CompressionMethod, ZipWriter, write::FileOptions};

pub struct ZipFile<'a> {
    writer: ZipWriter<Cursor<Vec<u8>>>,
    compression: FileOptions<'a, ()>,
    file_count: usize,
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
            file_count: 0,
        }
    }

    fn add_file(&mut self, name: &str, bytes: &[u8]) -> Result<()> {
        self.writer.start_file(name, self.compression)?;
        self.writer.write_all(bytes)?;
        self.file_count += 1;
        Ok(())
    }

    pub fn try_add_file(&mut self, name: &str, bytes: &[u8]) -> Result<(), AppError> {
        if bytes.is_empty() {
            return Ok(());
        }
        self.add_file(name, bytes).map_err(|e| {
            error!("Cannot add {name} to zip file: {e}.");
            AppError::Internal
        })
    }

    pub fn file_count(&self) -> usize {
        self.file_count
    }

    pub fn finish(self) -> Result<Vec<u8>> {
        let cursor = self.writer.finish().map_err(|_| AppError::Internal)?;
        Ok(cursor.into_inner())
    }
}

use rocket::http::ContentType;
use rocket::response::Responder;

use crate::types::apierror::AppError;

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
