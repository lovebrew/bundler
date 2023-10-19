import pytest

from http import HTTPStatus

from conftest import create_args
from flask.testing import FlaskClient


@pytest.mark.parametrize("target", ["hac"])
def test_no_icons(client: FlaskClient, target):
    """_summary_
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the icons are not supplied
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
        target (str)  : The target console`
    """

    args_query = create_args(
        "Test Name", "Test Description", "Test Author", "0.0.0", target
    )

    response = client.post("/compile", query_string=args_query)

    assert response.status_code == HTTPStatus.OK
    assert b"NRO0" in response.data
