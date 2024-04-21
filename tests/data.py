import logging
import io

from dataclasses import dataclass
from pathlib import Path


@dataclass
class Resource:
    path: str
    name: str
    data: io.BytesIO

    def str(self) -> str:
        return self.data.getvalue().decode()

    def bytes(self) -> bytes:
        return self.data.getvalue()

    def __str__(self):
        return f"Resource({self.path}, {self.name}, {self.data})"

    def __repr__(self):
        return self.__str__()


RESOURCES = dict()
RESOURCE_PATH = Path(__file__).parent / "common"
RESOURCE_FILES_DIR = RESOURCE_PATH / "resources"


def setup_data() -> None:
    """
    Sets up the resources for the tests.
    """

    for resource in RESOURCE_FILES_DIR.rglob("*"):
        if resource.is_dir():
            continue

        filepath = str(resource.absolute())
        filename = resource.name
        filedata = io.BytesIO(resource.read_bytes())

        RESOURCES[filename] = Resource(filepath, filename, filedata)


def big_textures() -> tuple[Resource]:
    return (value for key, value in RESOURCES.items() if "cat_big" in key)


def invalid_textures() -> tuple[Resource]:
    names = {"chika.gif", "rectangle.bmp", "rectangle.tga"}
    return (value for key, value in RESOURCES.items() if key in names)


def invalid_files() -> tuple[Resource]:
    names = {"corrupt.png", "corrupt.ttf"}
    return (value for key, value in RESOURCES.items() if key in names)


def get_resource(filename) -> Resource:
    resource = RESOURCES.get(filename)

    if resource:
        return resource

    logging.error(f"Resource {filename} not found!")
