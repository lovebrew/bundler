import pytest

import string
import random

from http import HTTPStatus, HTTPMethod


@pytest.mark.parametrize("root", ["/", "/index"])
def test_landing(client, root):
    """
    GIVEN a Flask application configured for testing
    WHEN the root page is requested (GET)
    THEN check that the response is valid

    Args:
        client (Flask): The webserver client
        root   (str)  : The page to request
    """

    response = client.get(root)
    html = response.data.decode()

    assert "<title>LÖVEBrew: Bundle Your Game</title>" in html
    assert response.status_code == HTTPStatus.OK


@pytest.mark.parametrize(
    "page, method",
    [
        ("/", "POST"),
        ("/index", "POST"),
        ("/", "PUT"),
        ("/index", "PUT"),
        ("/", "DELETE"),
        ("/index", "DELETE"),
        ("/", "PATCH"),
        ("/index", "PATCH"),
        ("/", "TRACE"),
        ("/index", "TRACE"),
    ],
)
def test_invalid_request(client, page: str, method: str):
    """
    GIVEN a Flask application configured for testing
    WHEN an page is requested (not GET)
    THEN check that the response is invalid

    Args:
        client (Flask): The webserver client
        method (str)  : The HTTP method
    """

    response = getattr(client, method.lower())(page)

    assert response.status_code == HTTPStatus.METHOD_NOT_ALLOWED
