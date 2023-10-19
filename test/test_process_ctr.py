import io
import pytest

from http import HTTPStatus

from conftest import create_args, fetch
from flask.testing import FlaskClient


def test_no_icons(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the icons are not supplied
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
    """

    args_query = create_args(
        "Test Name", "Test Description", "Test Author", "0.0.0", "ctr"
    )

    response = client.post("/compile", query_string=args_query)

    assert response.status_code == HTTPStatus.OK
    assert response.data[:4] == b"3DSX"


def test_custom_icon(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the icons are not supplied
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
    """

    args_query = create_args(
        "Test Name", "Test Description", "Test Author", "0.0.0", "ctr"
    )

    icon_data = io.BytesIO(fetch("icon48.png"))

    response = client.post(
        "/compile",
        query_string=args_query,
        data={"icon-ctr": (icon_data, "icon-ctr.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == HTTPStatus.OK
    assert response.data[:4] == b"3DSX"


@pytest.mark.parametrize(
    "metadata",
    [
        {"target": "ctr"},
        {"title": "Test", "target": "ctr"},
        {"author": "Test", "target": "ctr"},
        {"description": "Test", "target": "ctr"},
        {"version": "1.0.0", "target": "ctr"},
    ],
)
def test_default_metadata(client: FlaskClient, metadata: dict[str, str]):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the icons are not supplied
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
    """

    response = client.post("/compile", query_string=metadata)

    assert response.status_code == HTTPStatus.OK
    assert response.data[:4] == b"3DSX"

    smdh_data = response.data.find(b"SMDH") + 0x04

    default_title = "Untitled"
    default_description = "No description"
    default_version = "0.0.0"
    default_author = "Unknown"

    for index in range(0, 0x0A):
        short_description = response.data[smdh_data : smdh_data + 0x80].decode(
            "UTF-16LE"
        )

        if short_description != default_title:
            assert short_description == metadata.get("title")

        smdh_data += 0x80

        long_description, version = (
            response.data[smdh_data : smdh_data + 0x100].decode("UTF-16LE").split(" • ")
        )

        if long_description != default_description:
            assert long_description == metadata.get("description")

        if version != default_version:
            assert version == metadata.get("version")

        smdh_data += 0x100

        author = response.data[smdh_data : smdh_data + 0x80].decode("UTF-16LE")

        if author != default_author:
            assert author == metadata.get("author")

        smdh_data += 0x80


@pytest.mark.parametrize("texture_name", ["lenny.png", "dio.jpg"])
def test_convert_texture(client: FlaskClient, texture_name: str):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/t3x URL is POSTed
    AND the texture is supplied
    THEN check that the response is valid

    Args:
        client (FlaskClient): The webserver client
        texture_path (str): Texture path
    """

    texture_path = fetch(texture_name)
    texture_extension = texture_name.split(".")[-1]

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data={f"file.{texture_extension}": (io.BytesIO(texture_path), texture_name)},
    )

    assert response.status_code == HTTPStatus.OK


@pytest.mark.parametrize("font_name", ["Perfect DOS VGA 437.ttf", "Oneday.otf"])
def test_convert_font(client: FlaskClient, font_name: str):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/bcfnt URL is POSTed
    AND the font is supplied
    THEN check that the response is valid

    Args:
        client (FlaskClient): The webserver client
        texture_path (str): Texture path
    """

    texture_path = fetch(font_name)
    texture_extension = font_name.split(".")[-1]

    response = client.post(
        "/convert/bcfnt",
        content_type="multipart/form-data",
        data={f"file.{texture_extension}": (io.BytesIO(texture_path), font_name)},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.data[:4] == b"CFNT"
