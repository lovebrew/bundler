use rocket::response::Responder;
use std::io::{Cursor, Write};
use zip::{CompressionMethod, ZipWriter, write::FileOptions};

struct ZipFile {
    writer: ZipWriter<Cursor<Vec<u8>>>,
}
