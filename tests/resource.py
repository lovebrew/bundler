import io

from dataclasses import dataclass


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
