import pytest
import tempfile
import io
import zipfile
import toml

from pathlib import Path

from flask import Flask
from flask.testing import FlaskClient

from lovebrew import create_app


@pytest.fixture()
def app():
    """Create a Flask application for development testing
    This will yield a testing client

    Yields:
        Flask: The webserver instance
    """

    app = create_app()
    app.config.update(
        {
            "TESTING": True,
        }
    )

    yield app


@pytest.fixture()
def client(app: Flask) -> FlaskClient:
    return app.test_client()


__DATA_DIRECTORY__ = Path(__file__).parent / "resources"
__CONFIG_FILE_DATA__ = __DATA_DIRECTORY__ / "lovebrew.toml"


def fetch(filename: str) -> bytes | None:
    try:
        filepath = __DATA_DIRECTORY__ / filename
        return filepath.read_bytes()
    except FileExistsError:
        return None


def create_zip_archive(files: dict) -> bytes:
    with tempfile.SpooledTemporaryFile() as temp_file:
        with zipfile.ZipFile(temp_file, "w") as archive:
            for filename, content in files.items():
                archive.writestr(filename, content)

        temp_file.seek(0, io.SEEK_SET)
        return temp_file.read()


def modify_config(root: str, key: str, value) -> bytes:
    result = dict()
    with open(__CONFIG_FILE_DATA__, "r") as config:
        result = toml.load(config)
        result[root][key] = value

    return bytes(toml.dumps(result), encoding="utf-8")


def modify_config_values(root: str, key_values: list[dict[str, any]]):
    result = dict()
    with open(__CONFIG_FILE_DATA__, "r") as config:
        result = toml.load(config)
        for data_replace in key_values:
            for key, value in data_replace.items():
                if key in result[root]:
                    result[root][key] = value

    return bytes(toml.dumps(result), encoding="utf-8")
