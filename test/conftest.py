import json
from urllib.parse import urlencode
import pytest

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


def resolve_path(path: str) -> str:
    return __DATA_DIRECTORY__ / path


def create_args(
    title: str, author: str, description: str, version: str, target: str
) -> dict[str, str]:
    args = {
        "title": title,
        "author": author,
        "description": description,
        "version": version,
        "targets": target,
    }

    return {k: v for k, v in args.items() if v is not None}


def decode_json_array(data: bytes, length: int) -> dict[str, str]:
    json_data = json.loads(data)
    assert len(json_data) == length

    return json_data


def decode_json_object(data: bytes, length: int) -> dict[str, str]:
    json_data = json.loads(data)
    assert len(json_data.keys()) == length

    return json_data


def assert_title(title: str, expected: str = "Untitled"):
    message = f"Title '{expected}' expected, got '{title}'"

    if expected != "Unknown":
        message = f"Custom {message}"

    assert title == expected, message


def assert_description(description: str, expected: str = "No description"):
    message = f"Description '{expected}' expected, got '{description}'"

    if expected != "No description":
        message = f"Custom {message}"

    assert description == expected, message


def assert_author(author: str, expected: str = "Unknown"):
    message = f"Author '{expected}' expected, got '{author}'"

    if expected != "Unknown":
        message = f"Custom {message}"

    assert author == expected, message


def assert_version(version: str, expected: str = "0.0.0"):
    message = f"Version '{expected}' expected, got '{version}'"

    if expected != "0.0.0":
        message = f"Custom {message}"

    assert version == expected, message
