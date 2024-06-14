using OpenQA.Selenium;

using Bundler.QA.Common;
using OpenQA.Selenium.DevTools.V123.IndexedDB;

namespace Bundler.QA.Frontend
{
    [TestFixture]
    internal class BundlerPage
    {
        private readonly WebDriver _webdriver;

        #region Strings

        private const string ExpectedTitle = "LÖVEBrew: Bundle Your Game";

        #endregion

        #region Elements

        private static By FileInput => By.XPath("//input[@type='file']");

        private static By SuccessToast => By.XPath("//*[contains(@class, 'bg-green-600')]");
        private static By ErrorToast => By.XPath("//*[contains(@class, 'bg-red-600')]");

        #endregion

        public BundlerPage()
        {
            this._webdriver = new WebDriver(WebDriver.DriverType.DRIVER_FIREFOX);

            Console.WriteLine("Navigating to Bundler page...");

            Assert.That(this._webdriver.Title(), Is.Not.Empty);
            Assert.That(this._webdriver.Title(), Is.EqualTo(ExpectedTitle));
        }

        public void Cleanup()
            => this._webdriver.Destroy();

        public void UploadFile(string name, bool isAsset = true)
        {
            Console.WriteLine($"Uploading {name}..");

            var file = isAsset ? Assets.Instance().GetFilepath(name) : name;
            this._webdriver.Find(FileInput)?.SendKeys(file);
        }

        public T GetIndexedDBData<T>(string dbName, string storeName)
        {
            return this._webdriver.GetIndexedDBData<T>(dbName, storeName);
        }

        public void AssertSuccessToast(string message)
        {
            var toast = this._webdriver.WaitFor(SuccessToast);

            Assert.That(toast, Is.Not.Null);
            Assert.That(toast.Text, Does.Contain(message), $"Expected '{message}', got '{toast.Text}'");

            Console.WriteLine("File uploaded successfully.");

            this._webdriver.WaitForInvisible(SuccessToast);
        }

        public void AssertErrorToast(string message)
        {
            var toast = this._webdriver.WaitFor(ErrorToast);

            Assert.That(toast, Is.Not.Null);
            Assert.That(toast.Text, Does.Contain(message), $"Expected '{message}', got '{toast.Text}'");

            this._webdriver.WaitForInvisible(ErrorToast);
        }

        public string GetDownloadedFile()
        {
            return this._webdriver.GetLastDownloadedFile();
        }
    }
}
