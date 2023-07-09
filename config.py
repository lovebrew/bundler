from pathlib import Path

import tomllib


class Config:
    def __init__(self, file_data: str) -> None:
        self.data = dict()

        dict.update(self.data, tomllib.loads(str(file_data)))
        self.data["build"]["targets"] = list(set(self.data["build"]["targets"]))

    def __getitem__(self, item) -> any:
        return self.data[item]
