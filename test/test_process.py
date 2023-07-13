import pytest

from lovebrew import __SERVER_VERSION__

from pathlib import Path
from http import HTTPStatus

import io
import zipfile
import tempfile
import toml
import semver

__DATA_DIRECTORY__ = Path(__file__).parent / "resources"
__CONFIG_FILE_DATA__ = __DATA_DIRECTORY__ / "lovebrew.toml"

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
    AND we upload a zip file containing `lovebrew.toml`
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

    assert message == "MISSING_GAME_CONTENT"
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

    blob = b"\0" * 0x7E81

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
    toml_data = modify_config({"debug": {"version": "0.7.0"}})
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


# endregion

# region Positive Scenarios


@pytest.mark.parametrize(
    "platform,extension", [("ctr", "3dsx"), ("hac", "nro"), ("cafe", "wuhb")]
)
def build_platform(client, platform, extension):
    toml_file = modify_config({"build": {"targets": [platform]}})
    assert toml_file is not None

    zip_data = create_zip_archive(
        {
            "lovebrew.toml": toml_file,
            "graphics/lenny.png": fetch("lenny.png"),
            "fonts/Perfect DOS VGA 437.ttf": fetch("Perfect DOS VGA 437.ttf"),
        }
    )
    assert zip_data is not None

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(zip_data), "content.zip")},
    )

    assert response.status_code == HTTPStatus.OK

    with zipfile.ZipFile(io.BytesIO(response.data), "w+") as archive:
        assert len(archive.filelist) == 1
        assert extension in archive.filelist

        Path("example").mkdir(exist_ok=True)
        archive.extractall("example")


# endregion

# region Helper Methods


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


def modify_config(values: dict) -> bytes:
    result = dict()
    with open(__CONFIG_FILE_DATA__, "r") as config:
        result = toml.load(config)
        dict.update(result, values)

    return bytes(toml.dumps(result), encoding="utf-8")


# endregion
