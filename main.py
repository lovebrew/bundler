import tempfile
from pathlib import Path
import traceback
from datetime import date, datetime
import time
import zipfile

from flask import Flask, jsonify, request, render_template
import filetype
from semver import Version

from modes import Mode
from config import Config

from error import Error

app = Flask(__name__)

__NAME__ = "LÖVEBrew"
__TODAY__ = date.today().strftime("%B %d, %Y")
__TIME__ = datetime.now().strftime("%H:%M:%S")
__START__ = time.time()
__VERSION__ = "0.8.0"

# create logs dir
Path("logs").mkdir(exist_ok=True)


@app.route("/")
@app.route("/index")
def show_index() -> str:
    return render_template("index.html")


@app.route("/form")
def form() -> str:
    return render_template("form.html")


@app.route("/info", methods=["GET"])
def info():
    uptime = time.gmtime(time.time() - __START__)

    return jsonify(
        {
            "date": __TODAY__,
            "time": __TIME__,
            "uptime": time.strftime("%H:%M:%S", uptime),
            "version": __VERSION__,
        }
    )


def build_target(target: str, data: list, metadata: dict) -> tuple[str, int]:
    with tempfile.TemporaryDirectory(dir=tempfile.gettempdir()) as dir:
        build_dir = Path(dir)

        try:
            if metadata["app_version"] < 3 and target == "CAFE":
                return f"{Error.CAFE_INVALID_ON_APP_VERSION_2.name}", 400

            metadata["mode"] = target

            console = Mode[target].value(metadata)

            error = console.pre_build(build_dir, data[0], data[1]).build(build_dir)

            if error != Error.NONE:
                return f"Error building {target}: {error}", 400

            output_file = console.final_binary_path(build_dir)
            with open(str(output_file), "rb") as file:
                return file.read(), 200

        except KeyError as e:
            return f"{Error.TARGET_NOT_VALID.name} ({target}) {e}", 400
        except Exception:
            return f"An exception occurred: {traceback.format_exc()}", 400


__TARGET_EXTENSIONS__ = {"ctr": "3dsx", "hac": "nro", "cafe": "wuhb"}


def validate_version(version) -> Error:
    try:
        config_version = Version.parse(version)
        for compatible in Config.CompatibleVersions:
            compatible_version = Version.parse(compatible)
            if config_version < compatible_version:
                return f"{Error.OUTDATED_CONFIG.name} ({compatible} < {version})"

    except KeyError as e:
        return f"{Error.INVALID_CONFIG_DATA.name} ({e})"

    return Error.NONE


@app.route("/data", methods=["POST"])
def data():
    if len(request.args > 0):
        return Error.INVALID_METHOD_USE_WEBSITE.name, 400

    # make sure the user uploaded files
    if not "content" in request.files:
        return Error.NO_CONTENT_PACKAGE.name, 400

    # the file should always exist and be a **VALID** zip file
    file_type = filetype.guess(request.files["content"])
    if file_type is None or file_type.mime != "application/zip":
        return Error.CONTENT_NON_ZIP_FILE.name, 400

    # load the zip archive into memory
    archive = zipfile.ZipFile(request.files["content"], "r")

    # check that our config file exists
    if "lovebrew.toml" not in archive.namelist():
        return Error.MISSING_CONFIG_FILE.name, 400

    # load the toml config
    toml_data = archive.read("lovebrew.toml").decode("UTF-8")
    current_config = Config(toml_data)

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
        icon_file = Path(current_config["metadata"]["icons"][console])

        if icon_file in archive.namelist():
            icon_data[console] = archive.read(icon_file)

    data = [archive.read(f"{zip_name}.zip"), icon_data]

    try:
        target_version = current_config["build"]["app_version"]
        if not int(target_version) or target_version not in range(2, 3):
            return Error.INVALID_VERSION_SPECIFIED, 400

        metadata["app_version"] = target_version

    except ValueError:
        return Error.INVALID_VERSION_SPECIFIED.name, 400

    game_title = current_config["metadata"]["title"]
    temp_file = tempfile.TemporaryFile()

    build_data = None

    temp_log = tempfile.TemporaryFile()
    __LOG_FILE__ = Path(f"{temp_log.name}.log")

    with zipfile.ZipFile(f"{temp_file.name}.zip", "w") as build_data:
        for console in current_config["build"]["targets"]:
            data_or_error, code = build_target(console.upper(), data, metadata)

            if code == 200:
                extension = __TARGET_EXTENSIONS__[console]
                build_data.writestr(f"{game_title}.{extension}", data_or_error)
            else:
                __LOG_FILE__.write_text(data_or_error + "\n")

        with open(__LOG_FILE__, "r") as file:
            build_data.writestr("debug.log", file.read())

    build_data = Path(f"{temp_file.name}.zip").read_bytes()

    return build_data, 200


if __name__ == "__main__":
    from waitress import serve

    serve(app, host="0.0.0.0", port=5000)
