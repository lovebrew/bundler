from datetime import datetime, timedelta
from tempfile import TemporaryDirectory, gettempdir

from flask import Flask, request

from bundler.config import Environment
from bundler.error import BundlerException

from bundler.services.conversion import ConversionRequest


__INFO__JSON__ = None


def create_app(config_type: str = "DEVELOPMENT"):
    app = Flask(__name__)

    __config__ = Environment[config_type].value(app)
    app.config.from_object(__config__)

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

        with TemporaryDirectory(dir=gettempdir()) as directory:
            for item in files.items():
                try:
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
        return "Hello World"

    return app
