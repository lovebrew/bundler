using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

using OpenQA.Selenium.Firefox;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Edge;
using System.Diagnostics;

namespace Bundler.QA.Frontend
{
    internal class WebDriver
    {
        private readonly IWebDriver _driver;

        private static readonly string DownloadsPath = Path.GetFullPath($"{Directory.GetCurrentDirectory()}\\downloads");

        public enum DriverType
        {
            DRIVER_FIREFOX,
            DRIVER_CHROME,
            DRIVER_EDGE
        }

        public WebDriver(DriverType type)
        {
            this._driver = CreateWebDriver(type);

            this._driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);
            this._driver.Url = "http://localhost:5001";
        }

        public void Destroy()
        {
            try
            {
                this._driver.Quit();
                this._driver.Dispose();

                Process[] processes = Process.GetProcessesByName("geckodriver");
                foreach (var process in processes) process.Kill();

                processes = Process.GetProcessesByName("chromedriver");
                foreach (var process in processes) process.Kill();

                processes = Process.GetProcessesByName("msedgedriver");
                foreach (var process in processes) process.Kill();
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
            }
        }

        private static FirefoxDriver CreateFirefoxDriver()
        {
            var options = new FirefoxOptions();
            options.SetPreference("browser.download.folderList", 2);
            options.SetPreference("browser.download.manager.showWhenStarting", false);
            options.SetPreference("browser.download.dir", DownloadsPath);

            return new FirefoxDriver(options);
        }

        static IWebDriver CreateWebDriver(DriverType type)
        {
            return type switch
            {
                DriverType.DRIVER_FIREFOX => CreateFirefoxDriver(),
                DriverType.DRIVER_CHROME => new ChromeDriver(),
                DriverType.DRIVER_EDGE => new EdgeDriver(),
                _ => throw new ArgumentException("Invalid driver type")
            };
        }

        public string Title()
        {
            return this._driver.Title;
        }

        public IWebElement? Find(By search)
        {
            IWebElement? element = null;

            try
            {
                element = this._driver.FindElement(search);
            }
            catch (Exception e)
            {
                if (e is NoSuchElementException || e is WebDriverTimeoutException)
                {
                    Console.WriteLine(e.Message);
                    return null;
                }
            }

            return element;
        }

        public IWebElement? WaitFor(By search, int seconds = 10)
        {
            IWebElement? element = null;

            try
            {
                element = this._driver.FindElement(search);

                var wait = new WebDriverWait(this._driver, TimeSpan.FromSeconds(seconds));
                wait.Until(driver => element.Displayed && element.Enabled);
            }
            catch (Exception e)
            {
                if (e is NoSuchElementException || e is WebDriverTimeoutException)
                {
                    Console.WriteLine(e.Message);
                    return null;
                }
            }

            return element;
        }

        public IWebElement? WaitForInvisible(By search, int seconds = 10)
        {
            IWebElement? element = null;

            try
            {
                element = this._driver.FindElement(search);

                var wait = new WebDriverWait(this._driver, TimeSpan.FromSeconds(seconds));
                wait.Until(driver => !element.Displayed && !element.Enabled);
            }
            catch (Exception e)
            {
                if (e is NoSuchElementException || e is WebDriverTimeoutException)
                {
                    Console.WriteLine(e.Message);
                    return null;
                }
            }

            return element;
        }

        public void WaitForLastDownload()
        {

            try
            {
                var wait = new WebDriverWait(this._driver, TimeSpan.FromSeconds(10));
                wait.Until(driver => Directory.GetFiles(DownloadsPath).Length > 0 && new FileInfo($"{DownloadsPath}/bundle.zip").Length > 0);
            }
            catch (WebDriverTimeoutException e)
            {
                Console.WriteLine(e.Message);
            }
        }

        public string GetLastDownloadedFile()
        {
            this.WaitForLastDownload();

            var file = Directory.GetFiles(DownloadsPath).OrderByDescending(f => new FileInfo(f).CreationTime).FirstOrDefault();
            return file is not null ? file : throw new FileNotFoundException("No files found in downloads folder.");
        }
    }
}
