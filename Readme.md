# LÖVEBrew Bundler

Web-based service for building games with LÖVE Potion

## Installing

1. Make sure you are running Python >= 3.11
2. Clone this repository with `git clone --recurse-submodule https://github.com/lovebrew/bundler.git`
3. Run `pip install .` inside the repository directory
4. Alternatively, you can [use venv](https://docs.python.org/3/library/venv.html) to avoid conflicts with your local packages.
    - If you use Visual Studio Code, check [this page](https://code.visualstudio.com/docs/python/environments)

## Running

- **Production mode:** `waitress-serve --call "bundler:create_app()"`
- **Development mode:** `flask --app "bundler:create_app(dev=True)" run --debug`

The webserver does have a few dependencies outside of python: tex3ds, mkbcfnt, and several other homebrew tools provided by [devitPro's package manager]([https://github.com/devkitpro/devkitpro-pacman](https://devkitpro.org/wiki/devkitPro_pacman)). Once installed, simply run `pacman -S tex3ds 3ds-tools switch-tools wiiu-tools`.

You will also need the raw ELF binaries for [LÖVE Potion](https://github.com/lovebrew/lovepotion) along with the RomFS files and icons. These are to be placed inside of folders in `lovebrew-webserver/bin` based on each console: `ctr` for 3DS, `hac` for Switch, and `cafe` for Wii U.
