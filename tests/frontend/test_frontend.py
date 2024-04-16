from threading import Thread

from bundler import create_app

from common.classes.bundle import Bundle
from common.classes.config import Config
from common.classes.response import BundlerResponse

from data import Resource, RESOURCES, big_textures, get_resource, invalid_textures

from frontend.driver import Driver
from frontend.page.index import IndexPage

import pytest


class TestFrontend:

    @pytest.fixture()
    def driver(self):
        driver = Driver()

        app = create_app(dev=True)
        thread = Thread(target=app.run, daemon=True)
        thread.start()

        yield driver
        driver.quit()

    @pytest.fixture(autouse=True)
    def setup_method(self, driver: Driver):
        driver.get(driver.base_url)

    # region Landing Page

    def test_landing(self, driver: Driver):
        """
        Index Page should load without error.
        """

        IndexPage(driver)

    # endregion

    # region Bundle Upload

    @pytest.mark.parametrize(
        "files", [{"graphics/dio.jpg", "fonts/Oneday.otf", "sounds/game.ogg"}]
    )
    def test_bundle_upload_unpackaged(self, tmp_path, files: set[str], driver: Driver):
        """
        Uploading a valid bundle (unpackaged) is successful.
        """

        page = IndexPage(driver)

        with Bundle(f"{tmp_path}/bundle.zip") as bundle:
            bundle.writestr(*Config().dump())
            bundle.write_game_file("main.lua")
            bundle.write_game_files(files)

        page.upload_bundle(bundle.filepath())
        page.find_success_toast(IndexPage.DOWNLOADED_TEXT)

        latest_download = driver.get_latest_download()

        with BundlerResponse(latest_download) as response:
            response.validate_file_list()
            response.validate_unpackaged_contents(files)

    @pytest.mark.parametrize(
        "files", [{"graphics/dio.jpg", "fonts/Oneday.otf", "sounds/game.ogg"}]
    )
    def test_bundle_upload_packaged(self, tmp_path, driver: Driver, files: set[str]):
        """
        Uploading a valid bundle (packaged) is successful.
        """

        page = IndexPage(driver)

        with Bundle(f"{tmp_path}/bundle.zip") as bundle:
            bundle.writestr(*Config().packaged(True).dump())
            bundle.write_game_file("main.lua")
            bundle.write_game_files(files)

        page.upload_bundle(bundle.filepath())
        page.find_success_toast(IndexPage.DOWNLOADED_TEXT)

        latest_download = driver.get_latest_download()
        expected = {"SuperGame.3dsx", "SuperGame.nro", "SuperGame.wuhb"}

        with BundlerResponse(latest_download) as response:
            response.validate_file_list(expected)

    def test_macOS_bundle(self, driver: Driver):
        """
        Uploading a bundle made on macOS should work.
        """

        page = IndexPage(driver)

        macOS_bundle = get_resource("bundle-macOS.zip")
        page.upload_bundle(macOS_bundle.path)

        page.find_success_toast(IndexPage.DOWNLOADED_TEXT)

    def test_empty_bundle_upload(self, tmp_path, driver: Driver):
        """
        Uploading an empty bundle will notify the user.
        """

        page = IndexPage(driver)

        with Bundle(f"{tmp_path}/bundle.zip") as bundle:
            pass

        page.upload_bundle(bundle.filepath())

        text = page.get_toast_text()
        page.assert_text_contains(IndexPage.MISSING_CONFIG_TEXT, text)

    def test_bundle_no_source(self, tmp_path, driver: Driver):
        """
        Uploading a bundle without a source folder will notify the user.
        """

        page = IndexPage(driver)

        with Bundle(f"{tmp_path}/bundle.zip") as bundle:
            bundle.writestr(*Config().dump())

        page.upload_bundle(bundle.filepath())

        text = page.get_toast_text()
        page.assert_text_contains(IndexPage.SOURCE_NOT_FOUND_TEXT, text, is_regex=True)

    def test_invalid_upload(self, driver: Driver):
        """
        Uploading an invalid file type will notify the user.
        """

        page = IndexPage(driver)
        page.upload_file("lovebrew.toml")

        text = page.get_toast_text()
        page.assert_text_contains(IndexPage.INVALID_FILE_TYPE, text)

    # endregion

    # region File Upload (Convert)

    @pytest.mark.parametrize("resource", [RESOURCES["dio.jpg"], RESOURCES["lenny.png"]])
    def test_texture_convert(self, resource: Resource, driver: Driver):
        """
        Uploading a texture to the bundler should work.
        """

        page = IndexPage(driver)

        page.upload_file(resource.path)
        page.find_success_toast(IndexPage.DOWNLOADED_TEXT)

        latest_download = driver.get_latest_download()
        with BundlerResponse(latest_download) as response:
            response.validate_conversion({resource.name})

    @pytest.mark.parametrize(
        "resource", [RESOURCES["Oneday.otf"], RESOURCES["Perfect DOS VGA 437.ttf"]]
    )
    def test_font_convert(self, resource: Resource, driver: Driver):
        """
        Uploading a font to the bundler should work.
        """

        page = IndexPage(driver)

        page.upload_file(resource.path)
        page.find_success_toast("Downloaded.")

        latest_download = driver.get_latest_download()
        with BundlerResponse(latest_download) as response:
            response.validate_conversion({resource.name})

    @pytest.mark.parametrize("resource", big_textures())
    def test_big_texture_upload(self, resource: Resource, driver: Driver):
        """
        Uploading a big image to the bundler should error.
        """

        page = IndexPage(driver)

        page.upload_file(resource.path)

        text = page.get_toast_text()
        page.assert_text_contains(IndexPage.TEXTURE_TOO_LARGE_TEXT, text, is_regex=True)

    @pytest.mark.parametrize("resource", invalid_textures())
    def test_invalid_texture_upload(self, resource: Resource, driver: Driver):
        """
        Uploading an invalid image to the bundler should error.
        """

        page = IndexPage(driver)

        page.upload_file(resource.path)

        text = page.get_toast_text()
        page.assert_text_contains(IndexPage.INVALID_TEXTURE, text, is_regex=True)

    def test_invalid_font_upload(self, driver: Driver):
        """
        Uploading an invalid font to the bundler should error.
        """

        page = IndexPage(driver)

        page.upload_file(RESOURCES["corrupt.ttf"].path)

        text = page.get_toast_text()
        page.assert_text_contains(IndexPage.INVALID_FONT, text, is_regex=True)

    # endregion
