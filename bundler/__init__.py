from datetime import datetime, timedelta
import io
from tempfile import TemporaryDirectory, gettempdir

from flask import Flask, request

from bundler.config import Environment
from bundler.error import BundlerError, BundlerException

from bundler.services.compile import CompilationRequest, Console
from bundler.services.conversion import ConversionRequest


def create_app(dev: bool = False):
    app = Flask(__name__)

    config_type = "DEVELOPMENT" if dev else "PRODUCTION"
    __config__ = Environment[config_type].value(app)
    app.config.from_object(__config__)

    DEFAULT_DATA = app.config["DEFAULT_DATA"]

    @app.errorhandler(500)
    def internal_server_error(e):
        return "Internal Server Error", 500

    @app.route("/", methods=["GET"])
    def index():
        return "Hello World"

    @app.route("/info", methods=["GET"])
    def info():
        """
        Displays information about the bundler.

        Returns:
            str: JSON data containing information about the bundler.
        """

        time_delta = (datetime.now() - app.config["INIT_TIME"]).total_seconds()
        time_delta = str(timedelta(seconds=time_delta))

        return {
            "Server Time": datetime.now(),
            "Deployed": app.config["INIT_TIME"],
            "Uptime": time_delta,
            "Version": app.config["VERSION"],
        }

    @app.route("/convert", methods=["POST"])
    def convert():
        files = request.files
        result = list()

        try:
            if len(files) == 0:
                raise BundlerException(BundlerError.NO_FILES_PROVIDED)

            with TemporaryDirectory(dir=gettempdir()) as directory:
                for item in files.items():
                    _request = ConversionRequest(*item)
                    data = _request.convert(directory)

                    if not data:
                        continue

                    result.append(data)
        except BundlerException as e:
            return e.error

        return result

    @app.route("/compile", methods=["POST"])
    def compile():
        files = request.files
        args = request.args

        result = dict()

        try:
            metadata = {key: value for key, value in args.items() if key != "targets"}

            _request = CompilationRequest(**metadata)
            _targets = list(set(args.get("targets").split(",")))

            for target in _targets:
                if not target.title() in Console:
                    raise BundlerException(BundlerError.INVALID_TARGET_NAME, target)

                icon_name = f"icon-{target}"
                icon_data = files.get(icon_name, DEFAULT_DATA[target]["ICON"])

                _data = _request.compile(target, icon_data, DEFAULT_DATA[target])

                if not _data:
                    continue

                result.update(_data)
        except BundlerException as e:
            return e.error

        return result

    return app
