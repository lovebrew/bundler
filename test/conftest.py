import pytest
from flask import Flask, Response
from flask.testing import FlaskClient

from lovebrew import create_app


@pytest.fixture()
def app():
    """Create a Flask application for development testing
    This will yield a testing client

    Yields:
        Flask: The webserver instance
    """

    app = create_app()
    app.config.update(
        {
            "TESTING": True,
        }
    )

    yield app


@pytest.fixture()
def client(app: Flask) -> FlaskClient:
    return app.test_client()
