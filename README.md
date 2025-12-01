# Bundler

A single-page web application that simplifies the process of converting assets and building homebrew executable files for the Nintendo 3DS, Switch and Wii U. The application offers drag-and-drop functionality for multiple files, seamless backend integration, and user-friendly feedback mechanisms.

## Features

- **Drag-and-Drop File Uploads**: Users can upload multiple files via drag-and-drop or browsing.
- **File Validation**: Frontend validation ensures that uploaded files meet the required specifications.
- **Asset Conversion**: Converts textures and fonts into special formats for the 3DS.
- **Homebrew Compilation**: Builds homebrew executable files with metadata like title, description, and icon for the homebrew menu.
- **User Feedback**: Displays toast messages for success or errors during the process.
- **Download Handling**: Allows users to download files and verify their contents.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:3000/`. The application will automatically reload whenever you modify any of the source files.

For full functionality, run the API server ([repo here](https://github.com/lovebrew/bundler-api)). This will allow for asset conversion and homebrew binary compilation.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.
   
## Contributing

Contributions are welcome! Please submit a pull request or file an issue if you have suggestions or bug reports.
