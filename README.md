
# Bundler

A single-page web application that simplifies the process of converting assets and building homebrew executable files for the Nintendo 3DS, Switch and Wii U. The application offers drag-and-drop functionality for multiple files, seamless backend integration, and user-friendly feedback mechanisms.

## Features

- **Drag-and-Drop File Uploads**: Users can upload multiple files via drag-and-drop or browsing.
- **File Validation**: Frontend validation ensures that uploaded files meet the required specifications.
- **Asset Conversion**: Converts textures and fonts into special formats for the 3DS.
- **Homebrew Compilation**: Builds homebrew executable files with metadata like title, description, and icon for the homebrew menu.
- **User Feedback**: Displays toast messages for success or errors during the process.
- **Download Handling**: Allows users to download files and verify their contents.

## Deployment

### Prerequisites

- [Rust](https://www.rust-lang.org/)
- [npm](https://www.npmjs.com/)
- [devkitPro pacman](https://devkitpro.org/wiki/devkitPro_pacman) and the following packages:
  - `tex3ds` for 3DS asset conversion
  - `3dstools` for building 3DSX binaries
  - `switch-tools` for building NRO binaries
  - `wut-tools` for building WUHB binaries

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd bundler
   ```

2. Install client dependencies:
   ```bash
   cd client
   bun install
   ```

3. Build the client:
   ```bash
   bun run build
   ```

4. Run the server:
   ```bash
   cd ../server
   cargo run
   ```

## Contributing

Contributions are welcome! Please submit a pull request or file an issue if you have suggestions or bug reports.
