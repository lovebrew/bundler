use rocket::form::Form;
use rocket::fs::TempFile;

use crate::models::query::CompileOptions;
use crate::types::error::AppError;
use crate::types::zipfile::ZipFile;

#[derive(FromForm)]
pub struct IconData<'r> {
    pub icons: Vec<TempFile<'r>>,
}

#[post("/compile?<options..>", data = "<form>")]
pub async fn compile<'a>(
    options: CompileOptions,
    form: Option<Form<IconData<'a>>>,
) -> Result<ZipFile<'a>, AppError> {
    let mut targets = options.target.clone();
    targets.dedup();

    println!("{:?}", options);
    Ok(ZipFile::new())
}
