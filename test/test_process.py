import pytest

from flask.testing import FlaskClient

from lovebrew import __SERVER_VERSION__

from http import HTTPStatus

from conftest import create_args


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

    response = getattr(client, method.lower())("/compile")

    match method:
        case "GET" | "HEAD":
            assert response.status_code == HTTPStatus.NOT_FOUND
        case "PUT" | "PATCH" | "TRACE":
            assert response.status_code == HTTPStatus.METHOD_NOT_ALLOWED
        case _:
            assert False


@pytest.mark.parametrize("target", ["test", "test,example"])
def test_invalid_targets(client: FlaskClient, target: str):
    """
    GIVEN a Flask application configured for testing
    WHEN the /compile URL is POSTed
    AND the target is invalid
    THEN check that the response is invalid

    Args:
        client (FlaskClient): The webserver client
        target (str): The target
    """

    params = create_args("Test", "Testing", "Test Description", "0.1.0", target)
    response = client.post("/compile", query_string=params)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.content_type == "html/text"
