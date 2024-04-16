import logging
from sre_constants import IN

from data import get_resource

from frontend.page.base import AbstractBasePage
from frontend.driver import Driver

from frontend.locators.index import IndexPageLocators


class IndexPage(AbstractBasePage):
    SOURCE_NOT_FOUND_TEXT = r"Source folder '.+' not found"
    TEXTURE_TOO_LARGE_TEXT = r"Texture '.+' is too large"

    INVALID_TEXTURE = r"Texture '.+' is invalid"
    INVALID_FONT = r"Font '.+' is invalid"
    INVALID_FILE_TYPE = "Invalid file type."
    INVALID_FILE = "Invalid file."

    MISSING_CONFIG_TEXT = "Missing configuration file."

    DOWNLOADED_TEXT = "Downloaded."

    def __init__(self, driver: Driver):
        super().__init__(driver)

    @property
    def title(self):
        return "LÖVEBrew"

    def upload_file(self, filename: str):
        logging.info(f"Uploading file: {filename}")

        resource = get_resource(filename)
        filepath = filename

        if resource is not None:
            filepath = resource.path

        self.driver.find(IndexPageLocators.UploadInput).send_keys(filepath)

        return self

    def upload_bundle(self, filepath: str):
        logging.info(f"Uploading bundle: {filepath}")

        self.driver.find(IndexPageLocators.UploadInput).send_keys(filepath)

        return self

    def find_success_toast(self, message: str):
        locator = IndexPageLocators.SuccessToastSpecific
        locator = (locator[0], locator[1].format(message))

        self.driver.wait_until_visible(locator)

    def get_toast_text(self, success: bool = False):
        toast = IndexPageLocators.SuccessToast
        if not success:
            toast = IndexPageLocators.ErrorToast

        content = self.driver.wait_until_visible(toast).text

        return content
