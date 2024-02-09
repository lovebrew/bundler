import re

from frontend.driver import Driver


class AbstractBasePage:
    def __init__(self, driver: Driver):
        self.driver = driver
        self.__validate()

    @property
    def title(self):
        raise NotImplementedError

    def __validate(self):
        assert (
            self.title in self.driver.title()
        ), f"Expected title {self.title}, got {self.driver.title()}"

    def assert_text_match(self, value: str, expected: str, is_regex=False):
        if is_regex:
            assert re.match(
                value, expected
            ), f"Expected '{value}' to match '{expected}'"
        else:
            assert value == expected, f"Expected '{value}' to equal '{expected}'"

    def assert_text_contains(self, value: str, expected: str, is_regex=False):
        if is_regex:
            assert re.search(
                value, expected
            ), f"Expected '{value}' to be found in '{expected}'"
        else:
            assert value in expected, f"Expected '{value}' to be in '{expected}'"
