import os

from flask import Flask, request, send_file

from consoles.cafe import Cafe
from consoles.ctr import Ctr
from consoles.hac import Hac
from modes import Mode

app = Flask(__name__)


@app.route("/")
@app.route("/index")
def show_index() -> str:
    return "Hello World!"


CLASSES = {"ctr": Ctr, "hac": Hac, "cafe": Cafe}

metadata = {
    "title": "SuperGame",
    "description": "My awesome game",
    "version": "0.1.0",
    "author": "SuperAuthor",
    "icon": "",
    "game": "",
    "mode": "",
}


@app.route("/data", methods=["POST"])
def data():
    # update metadata with the params, only if the key is inside of it
    metadata.update({k: v for k, v in request.args.items() if k in metadata})

    if len(metadata["mode"]) == 0:
        return "Error: No mode was specified"

    if not Mode.contains(metadata["mode"]):
        return "Error: No valid mode was specified"

    if not "game" in request.files:
        return "Error: No valid game data sent"

    metadata["game"] = request.files["game"]

    if "icon" in request.files:
        metadata["icon"] = request.files["icon"]

    mode = metadata["mode"]
    console_data = CLASSES[mode](mode, metadata)

    error = console_data.build()

    if error:
        return f"Error building {mode}: {error}"

    return send_file(console_data.final_binary_path())


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", threaded=True)
