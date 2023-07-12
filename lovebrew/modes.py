from enum import Enum

from lovebrew.consoles.cafe import Cafe
from lovebrew.consoles.ctr import Ctr
from lovebrew.consoles.hac import Hac


class Mode(Enum):
    CTR = Ctr
    HAC = Hac
    CAFE = Cafe
