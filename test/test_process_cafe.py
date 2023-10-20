import base64
import pytest

from http import HTTPStatus

from conftest import create_args, decode_json_object

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
        "Test Name", "Test Description", "Test Author", "0.0.0", "cafe"
    )

    response = client.post("/compile", query_string=args_query)

    assert response.status_code == HTTPStatus.OK
    assert response.content_type == "application/json"

    json_data = decode_json_object(response.data, 1)
    binary_data = base64.b64decode(json_data.get("cafe"))

    assert binary_data[:4] == b"WUHB"
