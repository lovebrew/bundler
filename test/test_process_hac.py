import base64
import io
import pytest

from http import HTTPStatus

from conftest import (
    assert_title,
    assert_author,
    create_args,
    decode_json_object,
    resolve_path,
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
        "Test Name", "Test Description", "Test Author", "0.0.0", "hac"
    )

    response = client.post("/compile", query_string=args_query)

    assert response.status_code == HTTPStatus.OK
    assert response.content_type == "application/json"

    json_data = decode_json_object(response.data, 1)
    binary_data = base64.b64decode(json_data.get("hac"))

    assert b"NRO0" in binary_data


def test_custom_icon(client: FlaskClient):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the icons are supplied
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
    """

    args_query = create_args(
        "Test Name", "Test Description", "Test Author", "0.0.0", "hac"
    )

    icon_data = resolve_path("icon256.jpg")

    response = client.post(
        "/compile",
        query_string=args_query,
        data={"icon-hac": (io.BytesIO(icon_data.read_bytes()), "icon-hac.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == HTTPStatus.OK
    assert response.content_type == "application/json"

    json_data = decode_json_object(response.data, 1)
    binary_data = base64.b64decode(json_data.get("hac"))

    assert b"NRO0" in binary_data
    assert icon_data.read_bytes() in binary_data


@pytest.mark.parametrize(
    "metadata",
    [
        {"targets": "hac"},
        {"title": "Test", "targets": "hac"},
        {"author": "Test", "targets": "hac"},
        {"description": "Test", "targets": "hac"},
        {"version": "1.0.0", "targets": "hac"},
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
    binary_data = base64.b64decode(json_data.get("hac"))

    assert b"NRO0" in binary_data

    binary_size = int.from_bytes(binary_data[0x18:0x22], "little")

    aset_data = binary_data.find(b"ASET") + 0x08

    default_title = "Untitled"
    default_author = "Unknown"

    icon_section = binary_data[aset_data + 0x00 : aset_data + 0x10]
    icon_offset, icon_size = int.from_bytes(icon_section[:8], "little"), int.from_bytes(
        icon_section[8:], "little"
    )

    nacp_start = binary_size + icon_offset + icon_size
    nacp_titles = binary_data[nacp_start : nacp_start + (0x300 * 0x0C)]

    struct_offset = 0
    for _ in range(0, 0x0C):
        app_title = (
            nacp_titles[struct_offset : struct_offset + 0x200]
            .decode("utf-8")
            .replace("\x00", "")
        )

        if app_title != default_title:
            assert_title(app_title, metadata.get("title"))
        else:
            assert_title(app_title)

        struct_offset += 0x200

        app_author = (
            nacp_titles[struct_offset : struct_offset + 0x100]
            .decode("utf-8")
            .replace("\x00", "")
        )

        if app_author != default_author:
            assert_author(app_author, metadata.get("author"))
        else:
            assert_author(app_author)

        struct_offset += 0x100
