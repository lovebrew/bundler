from enum import Enum


class Mode(str, Enum):
    CTR = "ctr"
    HAC = "hac"
    CAFE = "cafe"

    @staticmethod
    def contains(__key: str) -> bool:
        return __key == "ctr" or __key == "hac" or __key == "cafe"
