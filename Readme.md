# LÖVEBrew Web Server

Web-based service for building games with LÖVE Potion

## Installing

1. Make sure you are running Python >= 3.11
2. Clone this repository with `git clone --recurse-submodule https://github.com/lovebrew/lovebrew-webserver.git`
3. Run `pip install .` inside the repository directory
4. Alternatively, you can use [venv to avoid conflicts with your local packages](https://docs.python.org/3/library/venv.html).
  - If you use Visual Studio Code, check [this page](https://code.visualstudio.com/docs/python/environments)

## Running

- **Production mode:** `waitress-serve --call "lovebrew:create_app"`
- **Development mode:** `flask --app "lovebrew:create_app(dev=True)" run`
