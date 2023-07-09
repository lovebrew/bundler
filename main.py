import tempfile
from pathlib import Path
import traceback
from datetime import date, datetime
import time
import zipfile

from flask import Flask, jsonify, request, send_file, render_template
import filetype

from modes import Mode
from config import Config

from error import Error

app = Flask(__name__)

__NAME__ = "LÖVEBrew"
__TODAY__ = date.today().strftime("%B %d, %Y")
__TIME__ = datetime.now().strftime("%H:%M:%S")
__START__ = time.time()
__VERSION__ = "0.1.0"


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


def build_target(target: str, metadata: dict) -> tuple[str, int]:
    with tempfile.TemporaryDirectory(dir=tempfile.gettempdir()) as dir:
        try:
            build_dir = Path(dir)
            console = Mode[target].value(metadata)

            error = console.build(build_dir)

            if error:
                return f"Error building {target}: {error}", 400

            output_file = console.final_binary_path(build_dir)
            with open(output_file, "rb") as file:
                return file.read()

        except KeyError:
            return f"{Error.TARGET_NOT_VALID.name} ({target})", 400
        except Exception:
            return f"An exception occurred: {traceback.format_exc()}", 400


@app.route("/data", methods=["POST"])
def data():
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

    # get our metadata
    metadata = current_config["metadata"]
    zip_name = current_config["build"]["source"]

    # check that our game zip file exists
    if f"{zip_name}.zip" not in archive.namelist():
        return Error.MISSING_GAME_CONTENT.name, 400

    # set the game data for metadata
    metadata["game"] = archive.read(f"{zip_name}.zip")

    for console in current_config["build"]["targets"]:
        data_or_error, code = build_target(console.upper(), metadata)
        print(data_or_error, code)

    return "Hello World", 200


if __name__ == "__main__":
    from waitress import serve

    serve(app, host="0.0.0.0", port=5000)
