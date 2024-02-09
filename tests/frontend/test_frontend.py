from tempfile import TemporaryDirectory, gettempdir

from threading import Thread

from bundler import create_app

from common.classes.bundle import Bundle
from common.classes.config import Config
from conftest import logger

from frontend.driver import Driver
from frontend.page.index import IndexPage

import pytest


class TestFrontend:

    @pytest.fixture(scope="class")
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

    def test_landing(self, driver: Driver):
        """
        Index Page should load without error.
        """

        IndexPage(driver)

    def test_invalid_upload(self, driver: Driver):
        """
        Uploading an invalid file type will notify the user.
        """

        page = IndexPage(driver)
        page.upload_file("lovebrew.toml")

        text = page.get_toast_text()
        page.assert_text_contains("Missing configuration file.", text)

    @pytest.mark.parametrize(
        "files", [[("dio.jpg", "/graphics/"), ("Oneday.otf", "/fonts/")]]
    )
    def test_bundle_upload(self, files: list[tuple[str, str]], driver: Driver):
        """
        Uploading a valid bundle is successful.
        """

        page = IndexPage(driver)

        with TemporaryDirectory(dir=gettempdir()) as tempdir:
            with Bundle(f"{tempdir}/bundle.zip", "w") as bundle:
                bundle.writestr(*Config().dump())
                bundle.write_game_file("main.lua")
                bundle.write_game_files(files)

            page.upload_bundle(bundle.filepath())

        text = page.get_toast_text(True)
        page.assert_text_contains("Missing configuration file.", text)

    def test_empty_bundle_upload(self, driver: Driver):
        """
        Uploading an empty bundle will notify the user.
        """

        page = IndexPage(driver)

        with TemporaryDirectory(dir=gettempdir()) as tempdir:
            with Bundle(f"{tempdir}/bundle.zip", "x") as bundle:
                pass

            page.upload_bundle(bundle.filepath())

        text = page.get_toast_text()
        page.assert_text_contains("Missing configuration file.", text)

    def test_bundle_no_source(self, driver: Driver):
        """
        Uploading a bundle without a source folder will notify the user.
        """

        page = IndexPage(driver)

        with TemporaryDirectory(dir=gettempdir()) as tempdir:
            with Bundle(f"{tempdir}/bundle.zip", "w") as bundle:
                bundle.writestr(*Config().dump())

            page.upload_bundle(bundle.filepath())

        text = page.get_toast_text()
        page.assert_text_contains(r"Source folder '\w+' not found", text, is_regex=True)
