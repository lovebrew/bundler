import logging

from datetime import datetime
from pathlib import Path

import toml
import time

from selenium.common.exceptions import NoSuchElementException

from selenium import webdriver

from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


FILE_PATH = Path(__file__).parent


class Driver:
    CONFIG_PATH = FILE_PATH / "config.toml"
    DOWNLOADS_DIR = None

    SCREENSHOTS_DIR = FILE_PATH / "screenshots"

    def __init__(self):
        config = dict()
        with open(Driver.CONFIG_PATH) as file:
            config = toml.load(file)

        driver = None
        driver_type = config["driver"]["browser"]

        logging.info(f"Downloads Directory: {Driver.DOWNLOADS_DIR}")

        match driver_type:
            case "chrome":
                driver = self.__init_chromedriver__()
            case "firefox":
                driver = self.__init__geckodriver__()
            case "edge":
                driver = self.__init_edgedriver__()
            case _:
                raise Exception("Invalid driver type")

        logging.info(f"Driver: {driver_type}")

        self.driver = driver
        self.base_url = config["driver"]["base_url"]

    def get_chromium_options(self, options):
        options.add_experimental_option(
            "prefs",
            {
                "download.default_directory": f"{Driver.DOWNLOADS_DIR}",
                "download.prompt_for_download": False,
                "savefile.default_directory": f"{Driver.DOWNLOADS_DIR}",
            },
        )

        options.add_experimental_option("excludeSwitches", ["enable-logging"])

    def __init_chromedriver__(self):
        options = ChromeOptions()
        self.get_chromium_options(options)

        return webdriver.Chrome(options)

    def __init__geckodriver__(self):
        options = FirefoxOptions()

        options.set_preference("browser.download.folderList", 2)
        options.set_preference("browser.download.dir", f"{Driver.DOWNLOADS_DIR}")
        options.set_preference("browser.helperApps.alwaysAsk.force", False)

        return webdriver.Firefox(options=options)

    def __init_edgedriver__(self):
        options = webdriver.EdgeOptions()
        self.get_chromium_options(options)

        return webdriver.Edge(options=options)

    @staticmethod
    def set_download_directory(directory: str):
        Driver.DOWNLOADS_BASE_DIR = Path(directory).resolve()

    def get_latest_download(self):
        # Wait for the download to complete based on the file size
        filename = Driver.DOWNLOADS_DIR / "bundle.zip"

        while True:
            current_size = filename.stat().st_size
            if not filename.exists() or current_size != filename.stat().st_size:
                time.sleep(1)
                continue

            if current_size == filename.stat().st_size:
                break

        result = sorted(
            Driver.DOWNLOADS_DIR.glob("*"),
            key=lambda x: x.stat().st_ctime,
            reverse=True,
        )[0]

        logging.info(f"Latest Download: {result}")
        return result

    def save_screenshot(self, filename: str):
        Driver.SCREENSHOTS_DIR.mkdir(exist_ok=True)

        time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.driver.save_screenshot(f"{Driver.SCREENSHOTS_DIR}/{filename}_{time}.png")

        return f"{Driver.SCREENSHOTS_DIR}/{filename}"

    def get_screenshot_as_png(self) -> bytes:
        return self.driver.get_screenshot_as_png()

    def get_screenshot_as_base64(self) -> str:
        return self.driver.get_screenshot_as_base64()

    def get(self, url: str):
        logging.info(f"GET: {url}")
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
        except Exception:
            raise

    def quit(self):
        if self.driver:
            self.driver.quit()
