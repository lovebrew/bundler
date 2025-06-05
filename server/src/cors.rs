use rocket::{
    Request, Response,
    fairing::{Fairing, Info, Kind},
    http::{Header, Method},
};

pub struct Cors;

const ALLOWED_ORIGINS: [&str; 3] = [
    "http://localhost:5000",
    "https://lovebrew.github.io",
    "https://bundle.lovebrew.org",
];

#[rocket::async_trait]
impl Fairing for Cors {
    fn info(&self) -> Info {
        Info {
            name: "Selective CORS Headers",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        let origin = request.headers().get_one("Origin");

        let path = request.uri().path();
        let method = request.method();

        match (path.as_str(), method) {
            ("/health", _) => {
                response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
                response.set_header(Header::new("Access-Control-Allow-Methods", "GET, OPTIONS"));
            }
            ("/convert", Method::Post) | ("/compile", Method::Post) => {
                for allowed in ALLOWED_ORIGINS {
                    if origin == Some(allowed) {
                        response.set_header(Header::new("Access-Control-Allow-Origin", allowed));
                        response.set_header(Header::new(
                            "Access-Control-Allow-Methods",
                            "POST, OPTIONS",
                        ));
                        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
                    }
                }
            }
            _ => {}
        }

        if method == Method::Options {
            response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
            response.set_header(Header::new("Access-Control-Max-Age", "86400"));
        }
    }
}
