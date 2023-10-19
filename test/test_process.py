from numpy import mat
import pytest

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


@pytest.mark.parametrize("target", ["ctr", "hac", "cafe"])
def test_no_icons(client, target):
    """_summary_
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND the icons are not supplied
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
        target (str)  : The target console`
    """

    query = create_args("Test", "Test", "Test", "0.0.0", target)
    response = client.post(query)
    print(response.data)
    assert response.status_code == HTTPStatus.OK
