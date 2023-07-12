import pytest

from pathlib import Path
from http import HTTPStatus

import zipfile

__DATA_DIRECTORY__ = Path("test/data")


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

    landing = getattr(client, method.lower())("/data")

    assert landing.status_code == HTTPStatus.METHOD_NOT_ALLOWED


def test_no_data(client):
    """
    GIVEN a Flask application configured for testing
    WHEN the /data URL is POSTed
    AND we did not upload any files
    THEN check that the response is invalid

    Args:
        client (Flask): The webserver client
    """

    landing = client.post("/data")
    html = landing.data.decode()

    assert "NO_CONTENT_PACKAGE" in html
    assert landing.status_code == HTTPStatus.BAD_REQUEST


# endregion

# region Positive Scenarios

# endregion

# region Helper Methods


def fetch(filename: str) -> Path:
    return __DATA_DIRECTORY__ / filename


# endregion
