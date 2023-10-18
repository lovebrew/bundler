from flask import Flask, request
from flask_cors import CORS
from hurry.filesize import size

__SERVER_VERSION__ = "0.9.0"

from lovebrew.consoles.ctr import Ctr

from lovebrew.error import Error
from lovebrew.config import Config
from lovebrew.command import Command
from lovebrew.modes import Mode

from datetime import datetime, timedelta
from pathlib import Path

import time
import tempfile


__NAME__ = "LÖVEBrew"
__TIME__ = datetime.now()
__START__ = time.time()

ConfigFile = None
__INDEX_PAGE__ = None
__STATIC_INFO__ = {"static_url_path": ""}


def create_app(test_config=None, dev=False) -> Flask:
    app = Flask(__name__, instance_relative_config=True, **__STATIC_INFO__)
    app.config["MAX_CONTENT_LENGTH"] = 0x2000000  # 32MB

    if dev:
        print("DEVELOPMENT MODE, CORS DISABLED")
        CORS(app)

    if test_config is not None:
        app.config.from_mapping(test_config)

    __INDEX_PATH__ = Path(app.static_folder).parent / "static/index.html"
    with open(__INDEX_PATH__, "r", encoding="utf-8") as index_file:
        __INDEX_PAGE__ = index_file.read()

    @app.errorhandler(413)
    def entity_too_large(e):
        file_size = size(app.config["MAX_CONTENT_LENGTH"])
        return f"{Error.CONTENT_ZIP_TOO_LARGE.name} (> {file_size})", 413

    @app.errorhandler(500)
    def internal_server_error(e):
        return "Internal Server Error", 500

    @app.route("/", methods=["GET"])
    @app.route("/index", methods=["GET"])
    def show_index() -> str:
        return __INDEX_PAGE__

    def convert_which(which: str) -> tuple[str, Path]:
        """Converts a file to a given format

        Args:
            which (str): The format to convert to

        Returns:
            Error | str: Error result
        """

        font_types = [".ttf", ".otf"]
        texture_types = [".png", ".jpg", ".jpeg"]

        command = Ctr.TexTool
        valid_types = texture_types
        if which == "bcfnt":
            command = Ctr.FontTool
            valid_types = font_types

        if len(request.files) == 0:
            return "No file uploaded", 400

        filename = Path(list(request.files.keys())[0])
        if not filename.suffix in valid_types:
            return f"Invalid file type: {filename.suffix}", 400

        request.files[str(filename)].save(str(filename))

        file_path = filename.with_suffix(f".{which}")
        args = {"file": str(filename), "out": file_path}

        return Command.execute(command, args), file_path

    @app.route("/convert/t3x", methods=["POST"])
    def convert_t3x() -> tuple[str, int] | tuple[bytes, int]:
        error, filepath = convert_which("t3x")

        if error != Error.NONE:
            return error, 400

        return filepath.read_bytes(), 200

    @app.route("/convert/bcfnt", methods=["POST"])
    def convert_bcfnt() -> tuple[str, int] | tuple[bytes, int]:
        error, filepath = convert_which("bcfnt")

        if error != Error.NONE:
            return error, 400

        return filepath.read_bytes(), 200

    @app.route("/info", methods=["GET"])
    def info():
        """Display the information of the web server

        Returns:
            str: The information of the web server
        """
        time_delta = (datetime.now() - __TIME__).total_seconds()
        system_uptime = str(timedelta(seconds=time_delta))

        return {
            "Server Time": datetime.now(),
            "Deployed": __TIME__,
            "Uptime": system_uptime,
            "Version": __SERVER_VERSION__,
        }

    @app.route("/compile", methods=["POST"])
    def compile() -> tuple[str, int] | tuple[bytes, int]:
        """Compiles homebrew data to the proper binary

        Returns:
            Error message or binary data
        """

        try:
            config = Config(request.args, request.files)
        except ValueError as e:
            return str(e), 400

        with tempfile.TemporaryDirectory(dir=tempfile.gettempdir()) as dir:
            console = Mode[config.get_target().upper()].value()
            build_dir = Path(dir)

            error = console.build(build_dir, config)

            if error != Error.NONE:
                return f"Error building {config.get_target().upper()}: {error}", 400

            binary_path = console.final_binary_path(build_dir, config.get_title())
            return binary_path.read_bytes()

    return app
