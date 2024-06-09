# Bundler

Bundler is a web-based service designed to streamline the process of managing [LÖVE Potion](https://github.com/lovebrew/lovepotion) games. With Bundler, users can upload their games, convert assets, and fuse games together, all through a convenient web interface.

## Features

- **Asset Conversion**: Convert supported texture and font formats to those compatible with LÖVE Potion on 3DS.
- **Game Packaging**: Create a binary for your game that can be run on 3DS, Switch, and Wii U with custom metadata and icons.
## Run Locally

Clone the project

```bash
  git clone https://github.com/lovebrew/bundler
```

Open the solution `bundler.sln` in Visual Studio or Visual Studio Code and select `Bundler.Server` to run. Click the play button to launch and point your browser to `http://localhost:5001`.


## Dependencies

In order for the application to properly work, several files must be given in the `Resources` directory inside of the `Bundler.Server` project. These files are specific to each console which are the ELF binaries, shaders and RomFS data.

Furthermore, for texture and font conversions to work, `tex3ds` and `mkbcfnt` must be installed which are provided by [devitPro's package manager](https://devkitpro.org/wiki/devkitPro_pacman). The following packages must also be installed from devkitPro-pacman for fused game content to work as well: `3ds-tools`, `switch-tools`, and `wiiu-tools`.
## Running Tests

To run tests, the Bundler will require being published for your platform first.

```bash
  dotnet publish --self-contained
```

Once this is built, the resulting published binary must be ran. Once it's live you can run tests.

```
  dotnet test
```
