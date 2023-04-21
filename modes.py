from enum import Enum

from consoles.cafe import Cafe
from consoles.ctr import Ctr
from consoles.hac import Hac


class Mode(Enum):
    CTR = Ctr
    HAC = Hac
    CAFE = Cafe
