import pytest

from http import HTTPStatus
import io
import zipfile

from conftest import modify_config_values, create_zip_archive, fetch


@pytest.mark.parametrize("version", [2, 3])
def test_build_cafe(client, version: int):
    """
    GIVEN a Flask application configured for testing
    WHEN a valid game is uploaded
    THEN check that the resulting zipfile contains a .wuhb file

    Args:
        client  (Flask): The webserver client
        version (int)  : The LÖVE Potion version
    """

    toml_file = modify_config_values(
        "build", [{"targets": ["cafe"], "app_version": version}]
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

    has_file = False
    with zipfile.ZipFile(io.BytesIO(response.data), "r") as archive:
        has_file = any("wuhb" in filename for filename in archive.namelist())

    if version == 2:
        assert has_file == False
    else:
        assert has_file == True
