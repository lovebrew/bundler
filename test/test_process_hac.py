import pytest

from http import HTTPStatus
import io
import zipfile

from conftest import modify_config_values, create_zip_archive, fetch


@pytest.mark.parametrize("version", [2, 3])
def test_build_hac(client, version: int):
    """
    GIVEN a Flask application configured for testing
    WHEN a valid game is uploaded
    THEN check that the resulting zipfile contains a .nro file

    Args:
        client  (Flask): The webserver client
        version (int)  : The LÖVE Potion version
    """

    toml_file = modify_config_values(
        "build", [{"targets": ["hac"], "app_version": version}]
    )
    assert toml_file is not None

    game_data = create_zip_archive(
        {
            "main.lua": fetch("main.lua"),
            "lenny.png": fetch("lenny.png"),
            "Perfect DOS VGA 437.ttf": fetch("Perfect DOS VGA 437.ttf"),
        }
    )
    assert game_data is not None

    root_data = create_zip_archive({"lovebrew.toml": toml_file, "game.zip": game_data})

    response = client.post(
        "/data",
        content_type="multipart/form-data",
        data={"content": (io.BytesIO(root_data), "content.zip")},
    )

    assert response.status_code == HTTPStatus.OK

    with zipfile.ZipFile(io.BytesIO(response.data), "r") as archive:
        assert any("nro" in filename for filename in archive.namelist())
