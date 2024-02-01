from genericpath import isfile
from importlib.metadata import metadata
from datetime import datetime
from enum import Enum
import io
from pathlib import Path
from re import sub

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
    DEFAULT_DATA = dict()

    def __validate_item(self, item: Path) -> io.BytesIO | Path:
        if not item.exists():
            return f"File {item} does not exist"

        return item

    def __setup_data(self) -> None:
        files_directory = Path(__file__).parent / "bin"
        for console in files_directory.glob("*"):
            self.DEFAULT_DATA[console.name] = dict()

        for console in self.DEFAULT_DATA:
            directory = files_directory / console
            ext = "jpg" if console == "hac" else "png"

            self.DEFAULT_DATA[console] = {
                "BINARY": self.__validate_item(directory / "lovepotion.elf"),
                "ICON": self.__validate_item(directory / f"icon.{ext}").read_bytes(),
                "ROMFS": self.__validate_item(directory / "files.romfs"),
            }

    def __init__(self, app=None) -> None:
        if self.TESTING:
            print("DEVELOPMENT MODE, CORS DISABLED")
            CORS(app)

        self.__setup_data()


class ProductionConfig(Config):
    TESTING = False


class Environment(Enum):
    DEVELOPMENT = Config
    PRODUCTION = ProductionConfig
