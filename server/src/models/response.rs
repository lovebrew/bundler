use std::io::Cursor;

use crate::types::zipfile::ZipFile;

use rocket::{
    http::{ContentType, Status},
    response::Responder,
};

pub struct Response<'a> {
    zip: ZipFile<'a>,
    status: Status,
}

impl<'a> Response<'a> {
    pub fn with_status(zip: ZipFile<'a>, status: Status) -> Self {
        Response { zip, status }
    }
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Response<'r> {
    fn respond_to(self, _request: &'r rocket::Request<'_>) -> rocket::response::Result<'o> {
        let bytes = self.zip.finish().map_err(|_| Status::InternalServerError)?;

        Ok(rocket::Response::build()
            .header(ContentType::new("application", "zip"))
            .sized_body(bytes.len(), Cursor::new(bytes))
            .status(self.status)
            .finalize())
    }
}
