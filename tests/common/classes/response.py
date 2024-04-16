from common.utility import transform_files

from zipfile import ZipFile


class BundlerResponse(ZipFile):
    """
    A readonly ZipFile that represents the response from the bundler.
    """

    UnpackagedAssetNames = {
        "ctr-assets.zip",
        "hac-assets.zip",
        "cafe-assets.zip",
    }

    def __init__(self, filepath):
        super().__init__(filepath, "r")

    def validate_file_list(self, file_list: set = UnpackagedAssetNames):
        """
        Asserts that the file list matches the given file list.
        """

        assert file_list.issubset(self.namelist())

    def validate_unpackaged_contents(self, expected: set):
        """
        Asserts that the unpackaged contents are valid.
        """

        for zip_archive_name in self.namelist():
            with ZipFile(self.open(zip_archive_name)) as asset_zip:
                expected_files = expected

                if "ctr" in asset_zip.filename:
                    expected_files = transform_files(expected)

                actual = asset_zip.namelist()
                is_subset = expected_files.issubset(actual)

                assert is_subset, f"Expected {expected} to be a subset of {actual}"

    def validate_conversion(self, file_list: set):
        """
        Asserts that converted files are valid.
        """

        actual_files = self.namelist()

        file_list = transform_files(file_list)
        assert file_list.issubset(actual_files)
