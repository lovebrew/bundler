use rocket::tokio::fs;

#[get("/health")]
pub async fn health_check() -> String {
    match fs::read_to_string(".cache").await {
        Ok(content) => content,
        Err(_) => "{ 'status': OK }".to_string(),
    }
}
