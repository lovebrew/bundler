import pytest

from http import HTTPStatus

from conftest import assert_title, assert_author, create_args

from flask.testing import FlaskClient


def test_no_icons(client: FlaskClient):
    """_summary_
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
    assert b"NRO0" in response.data


@pytest.mark.parametrize(
    "metadata",
    [
        {"target": "hac"},
        {"title": "Test", "target": "hac"},
        {"author": "Test", "target": "hac"},
        {"description": "Test", "target": "hac"},
        {"version": "1.0.0", "target": "hac"},
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
    assert b"NRO0" in response.data

    binary_size = int.from_bytes(response.data[0x18:0x22], "little")

    aset_data = response.data.find(b"ASET") + 0x08

    default_title = "Untitled"
    default_author = "Unknown"

    icon_section = response.data[aset_data + 0x00 : aset_data + 0x10]
    icon_offset, icon_size = int.from_bytes(icon_section[:8], "little"), int.from_bytes(
        icon_section[8:], "little"
    )

    nacp_start = binary_size + icon_offset + icon_size
    nacp_titles = response.data[nacp_start : nacp_start + (0x300 * 0x0C)]

    struct_offset = 0
    for _ in range(0, 0x0C):
        print(f"Iteration {_}")

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
