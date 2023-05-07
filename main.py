import tempfile
import zipfile
from pathlib import Path

from flask import Flask, request, send_file

from modes import Mode

app = Flask(__name__)


@app.route("/")
@app.route("/index")
def show_index() -> str:
    return "Hello World!"


metadata = {
    "title": "SuperGame",
    "description": "My awesome game",
    "version": "0.1.0",
    "author": "SuperAuthor",
    "icon": "",
    "game": "",
    "mode": "",
    "app_version": 2,
}


@app.route("/data", methods=["POST"])
def data():
    # update metadata with the params, only if the key is inside of it
    metadata.update({k: v for k, v in request.args.items() if k in metadata})

    if len(metadata["mode"]) == 0:
        return "Error: No mode was specified"

    if not "game" in request.files:
        return "Error: No valid game data sent"

    metadata["game"] = request.files["game"]

    if "icon" in request.files:
        metadata["icon"] = request.files["icon"]

    mode = metadata["mode"].upper()
    console_data = None
    file_data = None

    with tempfile.TemporaryDirectory(dir=tempfile.gettempdir()) as dir:
        try:
            console_data = Mode[mode].value(metadata)

            build_dir = Path(dir)
            error = console_data.build(build_dir)

            if error:
                return f"Error building {mode}: {error}", 400

            output_file = console_data.final_binary_path(build_dir)

            file_data = output_file.read_bytes()
        except Exception as e:
            return f"An exception occurred: {e}", 400

    return file_data, 200


if __name__ == "__main__":
    from waitress import serve

    serve(app, host="0.0.0.0", port=5000)
