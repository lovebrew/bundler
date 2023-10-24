import base64
import io
import json
import pytest

from http import HTTPStatus

from conftest import (
    create_args,
    decode_json_object,
    fetch,
    assert_title,
    assert_description,
    assert_author,
    assert_version,
    resolve_path,
    decode_json_array,
    decode_json_object,
)

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
    assert response.content_type == "application/json"

    json_data = decode_json_object(response.data, 1)
    binary_data = base64.b64decode(json_data.get("ctr"))

    assert binary_data[:4] == b"3DSX"


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
    assert response.content_type == "application/json"

    json_data = decode_json_object(response.data, 1)
    binary_data = base64.b64decode(json_data.get("ctr"))

    assert binary_data[:4] == b"3DSX"


@pytest.mark.parametrize(
    "metadata",
    [
        {"targets": "ctr"},
        {"title": "Test", "targets": "ctr"},
        {"author": "Test", "targets": "ctr"},
        {"description": "Test", "targets": "ctr"},
        {"version": "1.0.0", "targets": "ctr"},
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
    assert response.content_type == "application/json"

    json_data = decode_json_object(response.data, 1)
    binary_data = base64.b64decode(json_data.get("ctr"))

    assert binary_data[:4] == b"3DSX"

    smdh_data = binary_data.find(b"SMDH") + 0x04

    default_title = "Untitled"
    default_description = "No description"
    default_version = "0.0.0"
    default_author = "Unknown"

    for _ in range(0, 0x0A):
        short_description = (
            binary_data[smdh_data : smdh_data + 0x80]
            .decode("UTF-16LE")
            .replace("\x00", "")
        )

        if short_description != default_title:
            assert_title(short_description, metadata.get("title"))
        else:
            assert_title(short_description)

        smdh_data += 0x80

        long_description, version = (
            binary_data[smdh_data : smdh_data + 0x100]
            .decode("UTF-16LE")
            .replace("\x00", "")
            .split(" • ")
        )

        if long_description != default_description:
            assert_description(long_description, metadata.get("description"))
        else:
            assert_description(long_description)

        if version != default_version:
            assert_version(version, metadata.get("version"))
        else:
            assert_version(version)

        smdh_data += 0x100

        author = (
            binary_data[smdh_data : smdh_data + 0x80]
            .decode("UTF-16LE")
            .replace("\x00", "")
        )

        if author != default_author:
            assert_author(author, metadata.get("author"))
        else:
            assert_author(author)

        smdh_data += 0x80


@pytest.mark.parametrize("texture_name", ["lenny.png", "dio.jpg"])
def test_convert_texture_single(client: FlaskClient, texture_name: str):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/t3x URL is POSTed
    AND the texture is supplied
    THEN check that the response is valid

    Args:
        client (FlaskClient): The webserver client
        texture_path (str): Texture path
    """

    texture_path = resolve_path(texture_name)

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data={
            str(texture_path): (
                io.BytesIO(texture_path.read_bytes()),
                texture_name,
            )
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.content_type == "application/json"

    json_data = decode_json_array(response.data, 1)

    texture_filepath = json_data[0].get("filepath")
    assert texture_filepath == texture_path.with_suffix(".t3x").as_posix()


def test_convert_texture_multi(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/bcfnt URL is POSTed
    AND the font is supplied
    THEN check that the response is valid

    Args:
        client (FlaskClient): The webserver client
        texture_path (str): Texture path
    """

    texture_names = ["lenny.png", "dio.jpg"]
    texture_paths = {
        str(resolve_path(tex_name)): (
            io.BytesIO(resolve_path(tex_name).read_bytes()),
            tex_name,
        )
        for tex_name in texture_names
    }

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data=texture_paths,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.content_type == "application/json"

    json_data = decode_json_array(response.data, 2)

    texture_filepath = json_data[0].get("filepath")
    assert (
        texture_filepath
        == resolve_path(texture_names[0]).with_suffix(".t3x").as_posix()
    )

    texture_filepath = json_data[1].get("filepath")
    assert (
        texture_filepath
        == resolve_path(texture_names[1]).with_suffix(".t3x").as_posix()
    )


@pytest.mark.parametrize("font_name", ["Perfect DOS VGA 437.ttf", "Oneday.otf"])
def test_convert_font_single(client: FlaskClient, font_name: str):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/bcfnt URL is POSTed
    AND the font is supplied
    THEN check that the response is valid

    Args:
        client (FlaskClient): The webserver client
        texture_path (str): Texture path
    """

    font_path = resolve_path(font_name)

    response = client.post(
        "/convert/bcfnt",
        content_type="multipart/form-data",
        data={str(font_path): (io.BytesIO(font_path.read_bytes()), font_name)},
    )

    assert response.mimetype == "application/json"
    assert response.status_code == HTTPStatus.OK

    json_array = json.loads(response.data)
    assert 1 == len(json_array)

    font_filepath = json_array[0].get("filepath")
    assert font_filepath == font_path.with_suffix(".bcfnt").as_posix()

    font_data_b64 = json_array[0].get("data")
    assert font_data_b64 is not None

    font_data = base64.b64decode(font_data_b64)
    assert font_data[:4] == b"CFNT"


def test_convert_font_multi(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/bcfnt URL is POSTed
    AND the font is supplied
    THEN check that the response is valid

    Args:
        client (FlaskClient): The webserver client
        texture_path (str): Texture path
    """

    font_names = ["Perfect DOS VGA 437.ttf", "Oneday.otf"]
    font_paths = {
        str(resolve_path(font_name)): (
            io.BytesIO(resolve_path(font_name).read_bytes()),
            font_name,
        )
        for font_name in font_names
    }

    response = client.post(
        "/convert/bcfnt",
        content_type="multipart/form-data",
        data=font_paths,
    )

    assert response.mimetype == "application/json"
    assert response.status_code == HTTPStatus.OK

    json_array = json.loads(response.data)
    assert 2 == len(json_array)

    for font_info in json_array:
        value = font_info.get("data")

        font_data = base64.b64decode(value)
        assert font_data[:4] == b"CFNT"


def test_no_texture(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/t3x URL is POSTed
    AND the texture is NOT supplied
    THEN check that the response is NOT valid

    Args:
        client (FlaskClient): The webserver client
    """

    response = client.post("/convert/t3x")

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.content_type == "html/text"


@pytest.mark.parametrize("extension", ["png", "jpg", "jpeg"])
def test_no_texture_data(client: FlaskClient, extension: str):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/t3x URL is POSTed
    AND the texture is supplied
    AND the texture is valid (.jpg, .jpeg, .png) but empty
    THEN check that the response is NOT valid

    Args:
        client (FlaskClient): The webserver client
    """

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data={f"blank.{extension}": (io.BytesIO(b""), f"blank.{extension}")},
    )

    assert response.status_code == HTTPStatus.UNSUPPORTED_MEDIA_TYPE
    assert response.content_type == "html/text"


def test_no_font(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/bcfnt URL is POSTed
    AND the font is NOT supplied
    THEN check that the response is NOT valid

    Args:
        client (FlaskClient): The webserver client
    """

    response = client.post("/convert/bcfnt")

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.content_type == "html/text"


@pytest.mark.parametrize("extension", ["ttf", "otf"])
def test_no_font_data(client: FlaskClient, extension: str):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/bcfnt URL is POSTed
    AND the font is supplied
    AND the font is valid (.ttf, .otf) but empty
    THEN check that the response is NOT valid

    Args:
        client (FlaskClient): The webserver client
    """

    response = client.post(
        "/convert/bcfnt",
        content_type="multipart/form-data",
        data={f"blank.{extension}": (io.BytesIO(b""), f"blank.{extension}")},
    )

    assert response.status_code == HTTPStatus.UNSUPPORTED_MEDIA_TYPE
    assert response.content_type == "html/text"


def test_invalid_texture_type(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /convert/t3x URL is POSTed
    AND the texture is supplied
    AND the texture is not a valid type (.jpg, .jpeg, .png)
    THEN check that the response is NOT valid

    Args:
        client (FlaskClient): The webserver client
    """

    texture_path = resolve_path("chika.gif")

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data={
            str(texture_path): (
                io.BytesIO(texture_path.read_bytes()),
                texture_path.name,
            )
        },
    )

    assert response.status_code == HTTPStatus.UNSUPPORTED_MEDIA_TYPE
    assert response.content_type == "html/text"


@pytest.mark.parametrize("filepath", ["cat_big_both.png", "cat_big_both.jpg"])
def test_convert_big_dimensions_both(client: FlaskClient, filepath: str):
    texture_path = resolve_path(filepath)

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data={
            str(texture_path): (
                io.BytesIO(texture_path.read_bytes()),
                texture_path.name,
            )
        },
    )

    assert response.content_type == "html/text"
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert response.data.decode("UTF-8") == "DIMENSIONS_TOO_LARGE"


@pytest.mark.parametrize("filepath", ["cat_big_width.png", "cat_big_width.jpg"])
def test_convert_big_dimensions_width(client: FlaskClient, filepath: str):
    texture_path = resolve_path(filepath)

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data={
            str(texture_path): (
                io.BytesIO(texture_path.read_bytes()),
                texture_path.name,
            )
        },
    )

    assert response.content_type == "html/text"
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert response.data.decode("UTF-8") == "WIDTH_TOO_LARGE"


@pytest.mark.parametrize("filepath", ["cat_big_height.png", "cat_big_height.jpg"])
def test_convert_big_dimensions_height(client: FlaskClient, filepath: str):
    texture_path = resolve_path(filepath)

    response = client.post(
        "/convert/t3x",
        content_type="multipart/form-data",
        data={
            str(texture_path): (
                io.BytesIO(texture_path.read_bytes()),
                texture_path.name,
            )
        },
    )

    assert response.content_type == "html/text"
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert response.data.decode("UTF-8") == "HEIGHT_TOO_LARGE"
