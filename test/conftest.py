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


def create_args(title: str, author: str, description: str, version: str) -> str:
    return f"/compile?title={title}&author={author}&description={description}&version={version}"
