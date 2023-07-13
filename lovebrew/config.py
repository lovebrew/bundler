from pathlib import Path

import tomllib


class Config:
    CompatibleVersions = ["0.8.0"]
    DefaultConfigPath = Path(__file__) / "static/lovebrew.toml"

    def __init__(self, file_data: str) -> None:
        self.data = dict()

        # default_data = tomllib.loads(Config.DefaultConfigPath)
        user_data = tomllib.loads(str(file_data))

        # for key in user_data.keys():
        #     if not key in default_data.keys():
        #         return False

        dict.update(self.data, user_data)
        self.data["build"]["targets"] = list(set(self.data["build"]["targets"]))

    def __getitem__(self, item) -> any:
        return self.data[item]
