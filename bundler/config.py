from importlib.metadata import metadata
from datetime import datetime
from enum import Enum

from flask import logging
from flask_cors import CORS

__metadata__ = metadata(__package__)


class Config(object):
    """
    Default Config class for the bundler.
    This is for development purposes only.
    """

    APP_NAME: str = __metadata__["name"]
    VERSION: str = __metadata__["version"]
    INIT_TIME: datetime = datetime.now()

    TESTING = True
    ENV = "dev"

    def __init__(self, app=None) -> None:
        if self.TESTING:
            print("DEVELOPMENT MODE, CORS DISABLED")
            CORS(app)


class ProductionConfig(Config):
    TESTING = False


class Environment(Enum):
    DEVELOPMENT = Config
    PRODUCTION = ProductionConfig
