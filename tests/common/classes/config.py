import toml

from conftest import get_resource


class Config:

    def __init__(self):
        resource = get_resource("lovebrew.toml")
        self._data = toml.loads(resource.str())

        for section, attributes in self._data.items():
            for attribute in attributes:
                setattr(self, attribute, self._make_setter(section, attribute))
                setattr(self, attribute, self._make_getter(section, attribute))

    def _make_setter(self, section: str, attribute: str):
        def setter(value: str) -> None:
            self._data[section][attribute] = value

        return setter

    def _make_getter(self, section: str, attribute: str):
        def getter() -> str:
            return self._data[section][attribute]

        return getter

    def empty(self) -> bool:
        return not bool(self._data)

    def dump(self) -> tuple[str, str]:
        return ("lovebrew.toml", toml.dumps(self._data).encode())

    def __str__(self) -> str:
        return toml.dumps(self._data)
