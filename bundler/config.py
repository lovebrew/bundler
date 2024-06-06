from importlib.metadata import metadata
from datetime import datetime
from enum import Enum
import io
from pathlib import Path

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
    SECRET_KEY_FILE = Path(__file__).parent / "secret.key"

    def __validate_item(self, item: Path) -> Path:
        if not item.exists():
            assert False, f"File {item} does not exist"

        return item

    def __setup_data(self) -> None:
        files_directory = Path(__file__).parent / "bin"
        for console in files_directory.glob("*"):
            self.DEFAULT_DATA[console.name] = dict()

        for console in self.DEFAULT_DATA:
            directory = files_directory / console

            ext = "jpg" if console == "hac" else "png"
            romfs = "content" if console == "cafe" else "files.romfs"

            self.DEFAULT_DATA[console] = {
                "BINARY": self.__validate_item(directory / "lovepotion.elf"),
                "ICON": io.BytesIO(
                    self.__validate_item(directory / f"icon.{ext}").read_bytes()
                ),
                "ROMFS": self.__validate_item(directory / romfs),
                "LAST_MODIFIED": (directory / "lovepotion.elf").stat().st_mtime,
            }

        # from secrets import token_hex
        assert self.SECRET_KEY_FILE.exists(), "Secret key does not exist"

    def __init__(self, app=None) -> None:
        if self.TESTING:
            print("DEVELOPMENT MODE, CORS DISABLED")
            CORS(app)

        self.__setup_data()
        self.SECRET_KEY = self.SECRET_KEY_FILE.read_text()


class ProductionConfig(Config):
    TESTING = False


class Environment(Enum):
    DEVELOPMENT = Config
    PRODUCTION = ProductionConfig
