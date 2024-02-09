from selenium.webdriver.common.by import By


class IndexPageLocators:
    UploadInput = (By.XPATH, "//input[@type='file']")
    ErrorToast = (By.XPATH, "//*[contains(@class, 'bg-red-600')]")
    SuccessToast = (By.XPATH, "//*[contains(@class, 'bg-green-600')]")
    UploadingToast = (By.XPATH, "//*[contains(@class, 'bg-neutral-800')]")
