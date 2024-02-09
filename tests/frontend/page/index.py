from conftest import get_resource
from frontend.page.base import AbstractBasePage
from frontend.driver import Driver

from frontend.locators.index import IndexPageLocators

from conftest import logger


class IndexPage(AbstractBasePage):
    def __init__(self, driver: Driver):
        super().__init__(driver)

    @property
    def title(self):
        return "LÖVEBrew"

    def upload_file(self, filename: str):
        logger().info(f"Uploading file: {filename}")

        resource_path = get_resource(filename).path
        self.driver.find(IndexPageLocators.UploadInput).send_keys(resource_path)

        return self

    def upload_bundle(self, filepath: str):
        logger().info(f"Uploading bundle: {filepath}")

        self.driver.find(IndexPageLocators.UploadInput).send_keys(filepath)

        return self

    def get_toast_text(self, success: bool = False):
        toast = IndexPageLocators.SuccessToast
        if not success:
            toast = IndexPageLocators.ErrorToast

        content = self.driver.wait_until_visible(toast).text

        return content
