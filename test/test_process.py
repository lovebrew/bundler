import pytest

from lovebrew import __SERVER_VERSION__

from pathlib import Path
from http import HTTPStatus

import io

from conftest import create_zip_archive, fetch, modify_config

# region Negative Scenarios


@pytest.mark.parametrize(
    "method",
    ["GET", "HEAD", "PUT", "PATCH", "TRACE"],
)
def test_invalid_request(client, method):
    """
    GIVEN a Flask application configured for testing
    WHEN an page is requested (not GET)
    THEN check that the response is invalid

    Args:
        client (Flask): The webserver client
        method (str)  : The HTTP method
    """

    response = getattr(client, method.lower())("/data")

    assert response.status_code == HTTPStatus.METHOD_NOT_ALLOWED


def test_no_package(client):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND we did not upload any files
    THEN check that the response is invalid

    Args:
        client (Flask): The webserver client
    """

    response = client.post("/data")
    message = response.data.decode()

    assert message == "NO_CONTENT_PACKAGE"
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_package_no_game(client):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND we upload a zip file containing only `lovebrew.toml`
    THEN check that the response is invalid

    Args:
        client (Flask): The webserver client
    """

    toml_file = fetch("lovebrew.toml")
    assert toml_file is not None

    zip_data = create_zip_archive({"lovebrew.toml": toml_file})
    assert zip_data is not None

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(zip_data), "content.zip")},
    )
    message = response.data.decode()

    assert "MISSING_GAME_CONTENT" in message
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_package_too_big(client):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND we upload a zip file > 0x7E80 (32MB)
    THEN check that the response is REQUEST_ENTITY_TOO_LARGE

    Args:
        client (Flask): The webserver client
    """

    blob = b"\0" * 0x2000001

    zip_data = create_zip_archive({"blob.txt": blob})
    assert zip_data is not None

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(zip_data),)},
    )

    assert response.status_code == HTTPStatus.REQUEST_ENTITY_TOO_LARGE


def test_package_empty(client):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND we upload an empty zip file(?)
    THEN check that the response is invalid

    Args:
        client (Flask): The webserver client
    """

    zip_data = create_zip_archive({})
    assert zip_data is not None

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(zip_data), "content.zip")},
    )
    message = response.data.decode()

    assert message == "MISSING_CONFIG_FILE"
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_version_outdated(client):
    toml_data = modify_config("debug", "version", "0.7.0")
    assert toml_data is not None

    zip_data = create_zip_archive({"lovebrew.toml": toml_data})
    assert zip_data is not None

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(zip_data), "content.zip")},
    )
    message = response.data.decode()

    assert "OUTDATED_CONFIG" in message
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_bad_config(client):
    """_summary_
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the lovebrew.toml is invalid
    THEN check that the response is invalid

    Args:
        client (Flask): The webserver client
    """

    toml_data = fetch("bad_config.toml")
    assert toml_data is not None

    zip_data = create_zip_archive({"lovebrew.toml": toml_data})
    assert zip_data is not None

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(zip_data), "content.zip")},
    )
    message = response.data.decode()

    assert "INVALID_CONFIG" in message
    assert response.status_code == HTTPStatus.BAD_REQUEST


# endregion


def test_no_icons(client):
    """_summary_
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the lovebrew.toml has no icons
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
    """

    toml_file = modify_config("metadata", "icons", {})
    assert toml_file is not None

    game_data = create_zip_archive(
        {
            "main.lua": fetch("main.lua"),
            "lenny.png": fetch("lenny.png"),
            "Perfect DOS VGA 437.ttf": fetch("Perfect DOS VGA 437.ttf"),
        }
    )
    assert game_data is not None

    root_data = create_zip_archive({"lovebrew.toml": toml_file, "game.zip": game_data})

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(root_data), "content.zip")},
    )

    assert response.status_code == HTTPStatus.OK
