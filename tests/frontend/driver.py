from pathlib import Path

import toml

from selenium.common.exceptions import NoSuchElementException

from selenium import webdriver

from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from tests.conftest import logger

FILE_PATH = Path(__file__).parent


class Driver:
    CONFIG_PATH = FILE_PATH / "config.toml"

    DOWNLOADS_DIR = FILE_PATH / "downloads"
    SCREENSHOTS_DIR = FILE_PATH / "screenshots"

    def __init__(self):
        config = dict()
        with open(Driver.CONFIG_PATH) as file:
            config = toml.load(file)

        driver = None
        driver_type = config["driver"]["browser"]

        match driver_type:
            case "chrome":
                driver = self.__init_chromedriver__()
            case "firefox":
                driver = self.__init__geckodriver__()
            case _:
                raise Exception("Invalid driver type")

        logger().info(f"Driver: {driver_type}")

        self.driver = driver
        self.driver.implicitly_wait(10)

        self.base_url = config["driver"]["base_url"]

    def __init_chromedriver__(self):
        options = ChromeOptions()

        options.add_experimental_option(
            "prefs",
            {
                "download.default_directory": f"{Driver.DOWNLOADS_DIR}",
                "download.prompt_for_download": False,
                "savefile.default_directory": f"{Driver.DOWNLOADS_DIR}",
            },
        )

        options.add_experimental_option("excludeSwitches", ["enable-logging"])

        return webdriver.Chrome(options)

    def __init__geckodriver__(self):
        options = FirefoxOptions()

        options.set_preference("browser.download.folderList", 2)
        options.set_preference("browser.download.dir", f"{Driver.DOWNLOADS_DIR}")
        options.set_preference("browser.helperApps.alwaysAsk.force", False)

        return webdriver.Firefox(options=options)

    def save_screenshot(self, filename: str):
        Driver.SCREENSHOTS_DIR.mkdir(exist_ok=True)
        self.driver.save_screenshot(f"{Driver.SCREENSHOTS_DIR}/{filename}")

        return f"{Driver.SCREENSHOTS_DIR}/{filename}"

    def get_screenshot_as_base64(self) -> str:
        return self.driver.get_screenshot_as_base64()

    def get(self, url: str):
        logger().info(f"GET: {url}")
        self.driver.get(url)

    def title(self) -> str:
        return self.driver.title

    def find(self, by: tuple[str, str]):
        try:
            return self.driver.find_element(*by)
        except NoSuchElementException:
            raise

    def wait_until_visible(self, by: tuple[str, str], timeout: int = 10):
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(by)
            )
        except Exception as e:
            raise

    def quit(self):
        if self.driver:
            self.driver.quit()
