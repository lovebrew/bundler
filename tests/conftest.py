import logging

from pathlib import Path
from datetime import datetime

from bundler import create_app
from data import setup_data

import pytest
import pytest_html

from frontend.driver import Driver


@pytest.fixture()
def app():
    app = create_app(dev=True)
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


LOGGING_DIRECTORY = Path(__file__).parent / "logs"
LOGGING_DIRECTORY.mkdir(exist_ok=True)

CURRENT_TEST = None


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_setup(item):
    config = item.config

    logging_plugin = config.pluginmanager.get_plugin("logging-plugin")

    timestamp = f"{datetime.now():%Y-%m-%d_%H-%M-%S}"

    directory = LOGGING_DIRECTORY / f"{item.name}_{timestamp}"
    directory.mkdir(exist_ok=True)

    logging_plugin.set_log_path(directory / "output.log")

    if "driver" in item.fixturenames:
        Driver.DOWNLOADS_DIR = directory

    yield


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    extras = getattr(report, "extras", [])

    if call.when == "call":
        if call.excinfo is not None:
            # if excinfor is not None, indicate that this test item is failed test case
            logging.error(f"Test Case: {item.name} Failed.")
            logging.error(f"Error: {call.excinfo.value}")

        if "driver" in item.fixturenames:
            driver = item.funcargs["driver"]
            screenshot = driver.get_screenshot_as_base64()

            extras.append(pytest_html.extras.png(screenshot, item.name))

        report.extras = extras


setup_data()
