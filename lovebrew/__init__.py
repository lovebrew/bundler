import base64
from flask import Flask, request
from flask_cors import CORS
from hurry.filesize import size

from http import HTTPStatus

from lovebrew.media import Media

__SERVER_VERSION__ = "0.9.0"

from lovebrew.error import Error, create_error
from lovebrew.config import Config
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

    def convert_which(which: str) -> tuple[str, list[dict[str, str]]] | tuple[str, int]:
        """Converts a file to a given format

        Args:
            which (str): The format to convert to

        Returns:
            tuple[str, list[dict[str, str]]] : Success, json data
            tuple[str, int]                  : Error, HTTP status code
        """

        if len(request.files) == 0:
            return Error.NO_FILE_UPLOADED, HTTPStatus.BAD_REQUEST

        json_result = list()

        with tempfile.TemporaryDirectory(dir=tempfile.gettempdir()) as directory:
            for file_name, file_storage in request.files.items():
                media = Media(directory, file_name, file_storage)

                if not media.is_valid():
                    return Error.INVALID_FILE_TYPE, HTTPStatus.UNSUPPORTED_MEDIA_TYPE
                else:
                    if (value := media.is_valid_texture()) != Error.NONE:
                        return value, HTTPStatus.UNPROCESSABLE_ENTITY

                    error_or_result = media.convert()

                    if isinstance(error_or_result, str):
                        return error_or_result, HTTPStatus.UNPROCESSABLE_ENTITY

                    encoded = base64.b64encode(error_or_result).decode("utf-8")
                    file_path = Path(file_name).with_suffix(f".{which}").as_posix()

                    json_result.append({"filepath": file_path, "data": encoded})

        return Error.NONE, json_result

    @app.route("/convert/t3x", methods=["POST"])
    def convert_t3x() -> tuple[str, int, dict[str, str]]:
        """Converts a texture to a t3x file

        Returns:
            tuple[str, int, dict[str, str]]: Resulting error or binary data, Http status code, Content type
        """

        error, json_or_code = convert_which("t3x")

        if error != Error.NONE:
            return create_error(error, json_or_code)

        return create_error(json_or_code, HTTPStatus.OK, "application/json")

    @app.route("/convert/bcfnt", methods=["POST"])
    def convert_bcfnt() -> tuple[str, int, dict[str, str]]:
        """Converts a font to a bcfnt file

        Returns:
            tuple[str, int, dict[str, str]]: Resulting error or binary data, Http status code, Content type
        """

        error, json_or_code = convert_which("bcfnt")

        if error != Error.NONE:
            return create_error(error, json_or_code)

        return create_error(json_or_code, HTTPStatus.OK, "application/json")

    @app.route("/info", methods=["GET"])
    def info():
        """Display the information of the web server

        Returns:
            str: The information of the web server
        """

        time_delta = (datetime.now() - __TIME__).total_seconds()
        system_uptime = str(timedelta(seconds=time_delta))

        return (
            {
                "Server Time": datetime.now(),
                "Deployed": __TIME__,
                "Uptime": system_uptime,
                "Version": __SERVER_VERSION__,
            },
            HTTPStatus.OK,
            {"Content-Type": "application/json"},
        )

    @app.route("/compile", methods=["POST"])
    def compile() -> tuple[str, int, dict[str, str]]:
        """Compiles homebrew data to the proper binary

        Returns:
            Error message or binary data
        """

        if len(list(request.args.keys())) == 0:
            return "No arguments supplied", 400

        try:
            config = Config(request.args, request.files)
        except ValueError as e:
            return create_error(str(e), HTTPStatus.BAD_REQUEST)

        json_data = dict()

        for target in config.get_targets():
            with tempfile.TemporaryDirectory(dir=tempfile.gettempdir()) as dir:
                console = Mode[target.upper()].value()
                build_dir = Path(dir)

                error = console.build(build_dir, config)

                if error != Error.NONE:
                    return create_error(error, HTTPStatus.UNPROCESSABLE_ENTITY)

                binary_path = console.final_binary_path(build_dir, config.get_title())

                encoded_data = base64.b64encode(binary_path.read_bytes())
                json_data[target] = encoded_data.decode("utf-8")

        return create_error(json_data, HTTPStatus.OK, "application/json")

    return app
