from flask.testing import FlaskClient


class TestBackend:

    def test_landing_page(self, client: FlaskClient):
        response = client.get("/")
        assert response.status_code == 200
