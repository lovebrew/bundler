using Bundler.QA.Common;

using System.IO.Compression;

namespace Bundler.QA.Frontend
{
    #region Types

    internal sealed class BinaryCache : Dictionary<string, object>
    {
        public BinaryCache(Dictionary<string, object> data)
        {
            this["ctr"] = data.TryGetValue("ctr", out object? ctr) ? ctr : default!;
            this["hac"] = data.TryGetValue("hac", out object? hac) ? hac : default!;
            this["cafe"] = data.TryGetValue("cafe", out object? cafe) ? cafe : default!;
            this["timestamp"] = data.TryGetValue("timestamp", out object? value) ? value : default!;

            // make sure all key values are not null
            if (this.Any(x => x.Value is null)) throw new ArgumentNullException();
        }
    };

    internal sealed class AssetCache : Dictionary<string, object>
    {
        public AssetCache(Dictionary<string, object> data)
        {
            this["file"] = data.TryGetValue("file", out object? file) ? file : default!;
            this["timestamp"] = data.TryGetValue("timestamp", out object? value) ? value : default!;

            if (this.Any(x => x.Value is null)) throw new ArgumentNullException();
        }
    }


    #endregion

    [NonParallelizable]
    internal class BundlerTest : BaseTest
    {
        private BundlerPage _page;

        #region Toast Messages

        private readonly string InvalidTexture = "Error: Texture '{0}' dimensions invalid.";
        private readonly string InvalidFileType = "Error: Invalid file type.";
        private readonly string InvalidTextureFile = "Error: Texture '{0}' is invalid.";
        private readonly string InvalidFontFile = "Error: Font '{0}' is invalid.";

        private readonly List<string> DefaultBundleNames = ["SuperGame.3dsx", "SuperGame.nro", "SuperGame.wuhb"];
        private readonly List<string> DefaultAssetNames = ["ctr-assets.zip", "hac-assets.zip", "cafe-assets.zip"];

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
        [Description("Test large texture files cannot upload (> 1024 pixels).")]
        public void TestUploadBigTextureDimensions(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidTexture, filename));
        }

        [TestCase("chika.gif")]
        [TestCase("rectangle.bmp")]
        [TestCase("rectangle.tga")]
        [Description("Test invalid texture types cannot upload.")]
        public void TestUploadInvalidTexture(string filename)
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
        [Description("Test small texture files cannot upload (< 3 pixels).")]
        public void TestUploadSmallTextureDimensions(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidTexture, filename));
        }

        [TestCase("corrupt.png")]
        [Description("Test 'corrupt' texture files cannot upload.")]
        public void TestUploadCorruptTextureFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidTextureFile, filename));
        }

        [TestCase("dio.jpg")]
        [TestCase("lenny.png")]
        [Description("Test valid texture files (jpg, png) can upload (within size limits).")]
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
        [Description("Test 'corrupt' font files cannot upload.")]
        public void TestUploadCorruptFontFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidFontFile, filename));
        }

        [TestCase("Oneday.otf")]
        [TestCase("Perfect DOS VGA 437.ttf")]
        [Description("Test valid font files (ttf, otf) can upload.")]
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

        [TestCase("arial.fnt")]
        [Description("Test invalid font files cannot upload.")]
        public void TestUploadInvalidFontFile(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertErrorToast(string.Format(this.InvalidFileType));
        }

        #endregion

        #region Bundle Upload

        [TestCase("bundle-macOS.zip")]
        [Description("Test a bundle created on macOS.")]
        public void TestMacOSBundle(string filename)
        {
            this._page.UploadFile(filename);
            this._page.AssertSuccessToast("Downloaded.");

            using var zip = ZipFile.OpenRead(this._page.GetDownloadedFile());

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
                Span<(string, string)> files =
                [
                    ("main.lua",      "game/main.lua"),
                    ("lovebrew.toml", "lovebrew.toml")
                ];
                
                CreateBundle("bundle.zip", files);

                this._page.UploadFile($"{Directory.GetCurrentDirectory()}\\bundle.zip", false);
                this._page.AssertSuccessToast("Success.");

                using var download = ZipFile.OpenRead(this._page.GetDownloadedFile());

                Assert.Multiple(() =>
                {
                    Assert.That(download.Entries, Has.Count.EqualTo(4)); // all binaries, logs
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

        #region Caching

        [TestCase]
        public void TestBundlerCachingSuccess()
        {
            this._page.UploadFile("bundle-Main.zip");
            this._page.AssertSuccessToast("Success.");

            var _stores = this._page.GetIndexedDBData<IReadOnlyCollection<object>>("bundler", "binaryCache");
            Assert.That(_stores, Has.Count.EqualTo(1));

            var _cache = new BinaryCache((Dictionary<string, object>)_stores.ElementAt(0));
            Assert.That(_cache, Has.Count.EqualTo(4));
        }

        [TestCase]
        public void TestBundlerAssetCachingSuccess()
        {
            try
            {
                Span<(string, string)> files =
                [
                    ("lovebrew.toml", "lovebrew.toml"),
                    ("Oneday.otf",    "game/Oneday.otf"),
                    ("lenny.png",     "game/lenny.png"),
                    ("dio.jpg",       "game/dio.jpg"),
                    ("main.lua",      "game/main.lua"),
                ];

                CreateBundle("bundle.zip", files);

                this._page.UploadFile($"{Directory.GetCurrentDirectory()}\\bundle.zip", false);
                this._page.AssertSuccessToast("Success.");

                var _stores = this._page.GetIndexedDBData<IReadOnlyCollection<object>>("bundler", "assetCache");
                Assert.That(_stores, Has.Count.EqualTo(3));

                for (int index = 0; index < _stores.Count; index++)
                {
                    var _cache = new AssetCache((Dictionary<string, object>)_stores.ElementAt(index));
                    Assert.That(_cache, Has.Count.EqualTo(2));
                }
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
