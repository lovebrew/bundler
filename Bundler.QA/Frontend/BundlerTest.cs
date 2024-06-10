using Bundler.QA.Common;

using System.IO.Compression;

namespace Bundler.QA.Frontend
{
    internal class BundlerTest
    {
        private BundlerPage _page;

        #region Toast Messages

        private string InvalidTexture = "Error: Texture '{0}' dimensions invalid.";
        private string InvalidFileType = "Error: Invalid file type.";
        private string InvalidTextureFile = "Error: Texture '{0}' is invalid.";
        private string InvalidFontFile = "Error: Font '{0}' is invalid.";

        private readonly List<string> DefaultBundleNames = new() { "SuperGame.3dsx", "SuperGame.nro", "SuperGame.wuhb" };
        private readonly List<string> DefaultAssetNames = new() { "ctr-assets.zip", "hac-assets.zip", "cafe-assets.zip" };

        #endregion

        [OneTimeSetUp]
        public void Setup()
            => this._page = new();

        [OneTimeTearDown]
        public void Teardown()
            => this._page.Cleanup();

        #region Texture Upload

        [TestCase("cat_big_width.png")]
        [TestCase("cat_big_height.png")]
        [TestCase("cat_big_both.png")]
        [TestCase("cat_big_width.jpg")]
        [TestCase("cat_big_height.jpg")]
        [TestCase("cat_big_both.jpg")]
        public void TestUploadBigFileDimensions(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidTexture, filename));
        }

        [TestCase("chika.gif")]
        [TestCase("rectangle.bmp")]
        [TestCase("rectangle.tga")]
        public void TestUploadInvalidFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(this.InvalidFileType);
        }

        [TestCase("small_both.png")]
        [TestCase("small_height.png")]
        [TestCase("small_width.png")]
        [TestCase("small_both.jpg")]
        [TestCase("small_height.jpg")]
        [TestCase("small_width.jpg")]
        public void TestUploadSmallFileDimensions(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidTexture, filename));
        }

        [TestCase("corrupt.png")]
        public void TestUploadCorruptTextureFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidTextureFile, filename));
        }

        [TestCase("dio.jpg")]
        [TestCase("lenny.png")]
        public void TestUploadValidTextureFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertSuccessToast("Downloaded.");

            string convertedName = Path.GetFileNameWithoutExtension(filename) + ".t3x";

            using var zip = ZipFile.OpenRead(this._page.GetDownloadedFile());

            Assert.Multiple(() =>
            {
                Assert.That(zip.Entries, Has.Count.EqualTo(2)); // Texture, log
                Assert.That(zip.Entries.FirstOrDefault(x => x.Name == convertedName) is not null);
            });
        }

        #endregion

        #region Font Upload

        [TestCase("corrupt.ttf")]
        public void TestUploadCorruptFontFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidFontFile, filename));
        }

        [TestCase("Oneday.otf")]
        [TestCase("Perfect DOS VGA 437.ttf")]
        public void TestUploadValidFontFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertSuccessToast("Downloaded.");

            string convertedName = Path.GetFileNameWithoutExtension(filename) + ".bcfnt";

            using var zip = ZipFile.OpenRead(this._page.GetDownloadedFile());

            Assert.Multiple(() =>
            {
                Assert.That(zip.Entries, Has.Count.EqualTo(2)); // Font, log
                Assert.That(zip.Entries.FirstOrDefault(x => x.Name == convertedName) is not null);
            });
        }

        #endregion

        #region Bundle Upload

        [TestCase("bundle-macOS.zip")]
        public void TestMacOSBundle(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertSuccessToast("Success.");

            using var zip = ZipFile.OpenRead(this._page.GetDownloadedFile());
            foreach (var item in zip.Entries)
                Console.WriteLine(item.Name);

            Assert.Multiple(() =>
            {
                Assert.That(zip.Entries, Has.Count.EqualTo(3));
                Assert.That(zip.Entries.Any(x => DefaultAssetNames.Contains(x.Name)));
            });
        }

        [TestCase]
        public void TestBasicBundle()
        {
            try
            {
                using (var bundle = ZipFile.Open("bundle.zip", ZipArchiveMode.Create))
                {
                    bundle.CreateEntryFromFile(Assets.Instance().GetFilepath("main.lua"), "game/main.lua");
                    bundle.CreateEntryFromFile(Assets.Instance().GetFilepath("lovebrew.toml"), "lovebrew.toml");
                }

                this._page.UploadFile($"{Directory.GetCurrentDirectory()}\\bundle.zip", false);
                this._page.AssertSuccessToast("Success.");

                using var download = ZipFile.OpenRead(this._page.GetDownloadedFile());

                Assert.Multiple(() =>
                {
                    Assert.That(download.Entries, Has.Count.EqualTo(5)); // all binaries, logs
                    Assert.That(download.Entries.Any(x => DefaultBundleNames.Contains(x.Name)));

                    foreach (var bundleName in DefaultBundleNames)
                    {
                        ZipArchiveEntry? entry = download.Entries.FirstOrDefault(x => x.Name == bundleName);
                        Assert.That(entry, Is.Not.Null);

                        using var binary = new ZipArchive(entry!.Open());
                        Assert.That(binary.Entries, Has.Count.EqualTo(1), bundleName);
                    }
                });
            }
            catch (InvalidDataException)
            {
                Console.WriteLine("Resulting bundle download did not append game archive.");
            }
            finally
            {
                File.Delete("bundle.zip");
            }
        }

        #endregion
    }
}
