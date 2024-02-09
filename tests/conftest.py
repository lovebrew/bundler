import io
import json
import logging

from pathlib import Path
from datetime import datetime

from bundler import create_app

from resource import Resource

import pytest


@pytest.fixture()
def app():
    app = create_app(dev=True)

    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def logger():
    return logging.getLogger(__name__)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_setup(item):
    config = item.config

    logging_plugin = config.pluginmanager.get_plugin("logging-plugin")

    directory = Path(__file__).parent / "logs"
    filename = f"{item.name}_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.log"

    logging_plugin.set_log_path(directory / filename)

    yield


def pytest_runtest_makereport(item, call):
    if call.when == "call":
        if call.excinfo is not None:
            # if excinfor is not None, indicate that this test item is failed test case
            logger().error(f"Test Case: {item.name} Failed.")
            logger().error(f"Error: {call.excinfo.value}")


RESOURCES = dict()
RESOURCE_PATH = Path(__file__).parent / "common"
RESOURCE_FILES_DIR = RESOURCE_PATH / "resources"

TEST_DATA_JSON = json.loads((RESOURCE_PATH / "data.json").read_text())

for resource in RESOURCE_FILES_DIR.rglob("*"):
    if resource.is_dir():
        continue

    filepath = str(resource.absolute())
    filename = resource.name
    filedata = io.BytesIO(resource.read_bytes())

    for key, filenames in TEST_DATA_JSON.items():
        if not resource.name in filenames:
            continue

        if not key in RESOURCES:
            RESOURCES[key] = list()

        RESOURCES[key].append(Resource(filepath, filename, filedata))


def get_resource(filename) -> Resource:
    for _, resources in RESOURCES.items():
        for resource in resources:
            if resource.name == filename:
                return resource

    logger().error(f"Resource {filename} not found!")
