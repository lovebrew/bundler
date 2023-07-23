import tomllib
from flask import Flask, jsonify, request, render_template
from hurry.filesize import size

from lovebrew.process import (
    validate_input_file,
    validate_version,
    build_target,
    __SERVER_VERSION__,
)
from lovebrew.error import Error
from lovebrew.config import Config
from lovebrew.logfile import Logger

from datetime import datetime, timedelta
from pathlib import Path

import time
import tempfile
import zipfile
import io

__NAME__ = "LÖVEBrew"
__TIME__ = datetime.now()
__START__ = time.time()

__TARGET_EXTENSIONS__ = {"ctr": "3dsx", "hac": "nro", "cafe": "wuhb"}


def create_app(test_config=None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config["MAX_CONTENT_LENGTH"] = 0x2000000  # 32MB

    if test_config is not None:
        app.config.from_mapping(test_config)

    @app.errorhandler(413)
    def entity_too_large(e):
        file_size = size(app.config["MAX_CONTENT_LENGTH"])
        return f"{Error.CONTENT_ZIP_TOO_LARGE.name} (> {file_size})", 413

    @app.route("/", methods=["GET"])
    @app.route("/index", methods=["GET"])
    def show_index() -> str:
        return render_template("index.html")

    @app.route("/info", methods=["GET"])
    def info():
        time_delta = (datetime.now() - __TIME__).total_seconds()
        system_uptime = str(timedelta(seconds=time_delta))

        return jsonify(
            {
                "Server Time": datetime.now(),
                "Deployed": __TIME__,
                "Uptime": system_uptime,
                "Version": __SERVER_VERSION__,
            }
        )

    @app.route("/data", methods=["POST"])
    def data():
        # make sure the user uploaded files
        if not "content" in request.files:
            return Error.NO_CONTENT_PACKAGE.name, 400

        if (value := validate_input_file(request.files["content"])) != Error.NONE:
            return value, 400

        # load the zip archive into memory
        archive = zipfile.ZipFile(request.files["content"], "r")

        # check that our config file exists
        if "lovebrew.toml" not in archive.namelist():
            return Error.MISSING_CONFIG_FILE.name, 400

        # load the toml config
        toml_data = archive.read("lovebrew.toml").decode("UTF-8")

        try:
            current_config = Config(toml_data)
        except tomllib.TOMLDecodeError:
            return Error.INVALID_CONFIG_DATA, 400

        # validate version
        debug_version = current_config["debug"]["version"]
        if (value := validate_version(debug_version)) != Error.NONE:
            return value, 400

        # get our metadata
        metadata = current_config["metadata"]
        zip_name = current_config["build"]["source"]

        # check that our game zip file exists
        if f"{zip_name}.zip" not in archive.namelist():
            return Error.MISSING_GAME_CONTENT.name, 400

        # set the game data for metadata
        icon_data = dict()
        for console in current_config["metadata"]["icons"]:
            icon_file = Path(current_config["metadata"]["icons"][console]).as_posix()
            if icon_file != "" and str(icon_file) in archive.namelist():
                icon_data[console] = archive.read(str(icon_file))

        data = [archive.read(f"{zip_name}.zip"), icon_data]

        try:
            target_version = current_config["build"]["app_version"]
            if not int(target_version) or target_version not in range(2, 3):
                return Error.INVALID_VERSION_SPECIFIED, 400

            metadata["app_version"] = target_version

        except ValueError:
            return Error.INVALID_VERSION_SPECIFIED.name, 400

        game_title = current_config["metadata"]["title"]

        build_data = None
        __LOG_FILE__ = Logger()

        with tempfile.SpooledTemporaryFile() as temp_file:
            with zipfile.ZipFile(temp_file, "w") as zip_data:
                for console in current_config["build"]["targets"]:
                    data_or_error, code = build_target(console.upper(), data, metadata)

                    if code == 200:
                        extension = __TARGET_EXTENSIONS__[console]
                        zip_data.writestr(f"{game_title}.{extension}", data_or_error)
                    else:
                        __LOG_FILE__.crit(data_or_error + "\n")

                zip_data.writestr("debug.log", __LOG_FILE__.get_content())

            temp_file.seek(0, io.SEEK_SET)
            build_data = temp_file.read()

        return build_data, 200

    return app
