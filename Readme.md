# LÖVEBrew web server

Web-based service for building games with LÖVE Potion

## Installing

1. Make sure you are running Python >= 3.11
2. Clone this repository and run `pip install` inside the repository directory

## Running

- **Production mode:** `waitress-serve --call "lovebrew:create_app"`
- **Development mode:** `flask --app "lovebrew:create_app(dev=True)" run`
