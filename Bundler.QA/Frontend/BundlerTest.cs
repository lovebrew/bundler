using System.Reflection;

using Bundler.QA.Common;
using static Bundler.QA.Common.Config;

using ICSharpCode.SharpZipLib.Zip;
using Microsoft.VisualStudio.TestPlatform.ObjectModel;

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

        private readonly string MissingConfigSection = "Invalid config content. Missing section: '{0}'";
        private readonly string MissingConfigField = "Missing config '{0}' field '{1}'.";
        private readonly string ConfigFieldTypeInvalid = "Config '{0}' field '{1}' type is invalid.";

        #endregion

        private readonly List<string> DefaultBundleNames = ["SuperGame.3dsx", "SuperGame.nro", "SuperGame.wuhb"];
        private readonly List<string> DefaultAssetNames = ["ctr-assets.zip", "hac-assets.zip", "cafe-assets.zip"];

        [OneTimeSetUp]
        public void OneTimeSetup()
            => this._page = new();

        [OneTimeTearDown]
        public void OneTimeTeardown()
            => this._page.Cleanup();

        [TearDown]
        public void Teardown()
        {
            if (Path.Exists("bundle.zip")) File.Delete("bundle.zip");
        }

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

            using var zip = new ZipFile(this._page.GetDownloadedFile());

            Assert.Multiple(() =>
            {
                Assert.That(zip, Has.Count.EqualTo(2)); // Texture, log
                Assert.That(zip.GetEntry(convertedName), Is.Not.Null);
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

            using var zip = new ZipFile(this._page.GetDownloadedFile());

            Assert.Multiple(() =>
            {
                Assert.That(zip, Has.Count.EqualTo(2)); // Font, log
                Assert.That(zip.GetEntry(convertedName), Is.Not.Null);
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

            using var zip = new ZipFile(this._page.GetDownloadedFile());

            Assert.Multiple(() =>
            {
                Assert.That(zip, Has.Count.EqualTo(3));

                foreach (var name in DefaultAssetNames)
                    Assert.That(zip.GetEntry(name), Is.Not.Null);
            });
        }

        [TestCase]
        [Description("Test a basic bundle upload.")]
        public void TestBasicBundle()
        {
            string directory = string.Empty;

            try
            {
                Span<BundleFile> files =
                [
                    new() { FileName = "main.lua",      EntryPath = "game/main.lua" },
                    new() { FileName = "lovebrew.toml", EntryPath = "lovebrew.toml" }
                ];

                CreateBundle("bundle.zip", files);

                this._page.UploadFile("bundle.zip", false);
                this._page.AssertSuccessToast("Success.");

                var file = this._page.GetDownloadedFile();

                using var download = new ZipFile(file);

                Assert.Multiple(() =>
                {
                    Assert.That(download, Has.Count.EqualTo(4)); // all binaries, logs

                    foreach (var bundleName in DefaultBundleNames)
                    {
                        ZipEntry? entry = download.GetEntry(bundleName);
                        Assert.That(download.GetEntry(bundleName), Is.Not.Null);

                        using var file = new ZipFile(download.GetInputStream(entry));

                        Assert.That(file, Has.Count.EqualTo(1));
                        Assert.That(file.GetEntry("main.lua"), Is.Not.Null);

                        if (bundleName.EndsWith(".wuhb")) continue;

                        var bytes = bundleName.EndsWith(".3dsx") switch
                        {
                            true => Assets.GetData("icon_big_default.bin"),
                            false => Assets.GetData("icon-hac-default.jpg")
                        };

                        using var stream = download.GetInputStream(entry);

                        var buffer = new byte[stream.Length];
                        stream.Read(buffer, 0, buffer.Length);

                        Assert.That(buffer.Intersect(bytes), Is.Not.Empty);
                    }
                });
            }
            catch (InvalidDataException)
            {
                Console.WriteLine("Resulting bundle download did not append game archive.");
                throw;
            }
        }

        [TestCase]
        [Description("Test a bundle upload without a configuration file.")]
        public void TestBundleUploadWithNoConfig()
        {
            Span<BundleFile> files =
            [
                new() { FileName = "main.lua", EntryPath = "game/main.lua" }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast("Missing configuration file.");
        }

        [TestCase]
        [Description("Test a bundle upload without a game directory.")]
        public void TestBundleUploadWithNoGame()
        {
            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml", Data = config.Data },
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast($"Source folder '{config?.Build?.Source}' not found");
        }

        [TestCase]
        [Description("Test a bundle upload with an empty configuration file.")]
        public void TestBundleUploadEmptyConfig()
        {
            var config = new Config();

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml", Data = config.Data }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast("Invalid configuration file.");
        }

        [TestCase(ConfigSection.Metadata)]
        [TestCase(ConfigSection.Build)]
        [Description("Test a bundle upload with an invalid configuration file with a missing required section.")]
        public void TestBundleUploadMissingConfigSection(ConfigSection section)
        {
            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            config[section] = null;

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml", Data = config.Data }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast(string.Format(MissingConfigSection, section.ToString().ToLower()));
        }

        [TestCase(ConfigSection.Build, ConfigSectionField.Source)]
        [TestCase(ConfigSection.Build, ConfigSectionField.Targets)]
        [TestCase(ConfigSection.Build, ConfigSectionField.Packaged)]
        [TestCase(ConfigSection.Metadata, ConfigSectionField.Title)]
        [TestCase(ConfigSection.Metadata, ConfigSectionField.Author)]
        [TestCase(ConfigSection.Metadata, ConfigSectionField.Description)]
        [TestCase(ConfigSection.Metadata, ConfigSectionField.Version)]
        [Description("Test a bundle upload with an invalid configuration file with a missing required section key.")]
        public void TestBundleUploadMissingConfigSectionKey(ConfigSection section, ConfigSectionField field)
        {
            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            config[section]![field] = null;

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml", Data = config.Data }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);

            var (sectionName, fieldName) = (section.ToString().ToLower(), field.ToString().ToLower());
            this._page.AssertErrorToast(string.Format(MissingConfigField, sectionName, fieldName));
        }

        [TestCase(ConfigSection.Metadata, ConfigSectionField.Title, "true")]
        [TestCase(ConfigSection.Metadata, ConfigSectionField.Author, "42069")]
        [TestCase(ConfigSection.Metadata, ConfigSectionField.Description, "[]")]
        [TestCase(ConfigSection.Metadata, ConfigSectionField.Version, "69")]
        [TestCase(ConfigSection.Build, ConfigSectionField.Source, "false")]
        [TestCase(ConfigSection.Build, ConfigSectionField.Targets, "\"KURWA\"")]
        [TestCase(ConfigSection.Build, ConfigSectionField.Packaged, "3.14159")]
        [Description("Test a bundle upload with an invalid configuration file with a wrong field type.")]
        public void TestBundleUploadWrongConfigFieldType(ConfigSection section, ConfigSectionField field, string value)
        {
            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            var content = config.SetField(field, value);

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml", Data = content }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);

            var (sectionName, fieldName) = (section.ToString().ToLower(), field.ToString().ToLower());
            this._page.AssertErrorToast(string.Format(ConfigFieldTypeInvalid, sectionName, fieldName));
        }

        [TestCase]
        [Description("Test a bundle upload with a garbage(?) configuration file.")]
        public void TestBundleUploadWithNonsenseConfig()
        {
            var content = GenerateRandomStringBytes(69);

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml", Data = content }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast("Invalid config content. Unable to parse TOML.");
        }

        [TestCase(ConfigIconType.CTR, "icon-ctr.png")]
        [TestCase(ConfigIconType.HAC,  "icon-hac.jpg")]
        //[TestCase(ConfigIconType.CAFE, "icon-cafe.png")]
        public void TestBundleUploadWithCustomIcon(ConfigIconType icon, string filename)
        {
            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            config[ConfigSection.Metadata]!.SetIcon(icon, $"icons/{filename}");

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml",     Data = config.Data    },
                new() { EntryPath = "game/main.lua",     FileName = "main.lua" },
                new() { EntryPath = $"icons/{filename}", FileName = filename   }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertSuccessToast("Success.");

            using var zip = new ZipFile(this._page.GetDownloadedFile());

            Assert.Multiple(() =>
            {
                Assert.That(zip, Has.Count.EqualTo(4)); // all binaries, logs

                foreach (var bundleName in DefaultBundleNames)
                {
                    ZipEntry? entry = zip.GetEntry(bundleName);
                    Assert.That(entry, Is.Not.Null);

                    var bytes = (icon == ConfigIconType.CTR) ? Assets.GetData("icon_big.bin") : Assets.GetData(filename);

                    using var stream = zip.GetInputStream(entry);

                    var buffer = new byte[stream.Length];
                    stream.Read(buffer, 0, buffer.Length);

                    Assert.That(buffer.Intersect(bytes), Is.Not.Empty);
                }
            });
        }

        [TestCase(ConfigIconType.CTR,  "lenny.png")]
        [TestCase(ConfigIconType.HAC,  "dio.jpg")]
        [TestCase(ConfigIconType.CAFE, "cat_big_both.png")]
        [Description("Validate that uploading a bundle with incorrect icon dimensions throws an error.")]
        public void TestBundleUploadWithCustomIconBadDimensions(ConfigIconType icon, string filename)
        {
            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            config[ConfigSection.Metadata]!.SetIcon(icon, $"icons/{filename}");

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml",     Data = config.Data    },
                new() { EntryPath = "game/main.lua",     FileName = "main.lua" },
                new() { EntryPath = $"icons/{filename}", FileName = filename   }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast($"Invalid {icon.ToString().ToLower()} icon dimensions.");
        }

        [TestCase(ConfigIconType.CTR)]
        [TestCase(ConfigIconType.HAC)]
        [TestCase(ConfigIconType.CAFE)]
        [Description("Validate that uploading a bundle with a bad icon mimetype throws an error.")]
        public void TestBundleUploadWithCustomIconBadMimetype(ConfigIconType icon)
        {
            var filename = "empty";

            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            config[ConfigSection.Metadata]!.SetIcon(icon, $"icons/{filename}");

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml",     Data = config.Data    },
                new() { EntryPath = "game/main.lua",     FileName = "main.lua" },
                new() { EntryPath = $"icons/{filename}", FileName = filename   }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast($"Icon for {icon.ToString().ToLower()} has no mimetype.");
        }

        [TestCase(ConfigIconType.CTR,  "corrupt.png")]
        [TestCase(ConfigIconType.HAC,  "corrupt.jpg")]
        [TestCase(ConfigIconType.CAFE, "corrupt.png")]
        [Description("Validate that uploading a bundle with a valid icon mimetype but invalid data throws an error.")]
        public void TestBundleUploadWithCustomIconInvalidImage(ConfigIconType icon, string filename)
        {
            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            config[ConfigSection.Metadata]!.SetIcon(icon, $"icons/{filename}");

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml",     Data = config.Data    },
                new() { EntryPath = "game/main.lua",     FileName = "main.lua" },
                new() { EntryPath = $"icons/{filename}", FileName = filename   }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast($"Invalid icon for {icon.ToString().ToLower()}.");
        }

        [TestCase(ConfigIconType.CTR)]
        [TestCase(ConfigIconType.HAC)]
        [TestCase(ConfigIconType.CAFE)]
        public void TestBundleUploadWithCustomIconIncorrectMimetype(ConfigIconType icon)
        {
            var filename = "yeetus.txt";

            var config = LoadConfig(Assets.GetFilepath("lovebrew.toml"));
            config[ConfigSection.Metadata]!.SetIcon(icon, $"icons/{filename}");

            Span<BundleFile> files =
            [
                new() { EntryPath = "lovebrew.toml",     Data = config.Data    },
                new() { EntryPath = "game/main.lua",     FileName = "main.lua" },
                new() { EntryPath = $"icons/{filename}", FileName = filename   }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertErrorToast($"Invalid {icon.ToString().ToLower()} icon mimetype.");
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
            Span<BundleFile> files =
            [
                new() { FileName = "lovebrew.toml", EntryPath = "lovebrew.toml"   },
                new() { FileName = "Oneday.otf",    EntryPath = "game/Oneday.otf" },
                new() { FileName = "lenny.png",     EntryPath = "game/lenny.png"  },
                new() { FileName = "dio.jpg",       EntryPath = "game/dio.jpg"    },
                new() { FileName = "main.lua",      EntryPath = "game/main.lua"   }
            ];

            CreateBundle("bundle.zip", files);

            this._page.UploadFile("bundle.zip", false);
            this._page.AssertSuccessToast("Success.");

            var _stores = this._page.GetIndexedDBData<IReadOnlyCollection<object>>("bundler", "assetCache");
            Assert.That(_stores, Has.Count.EqualTo(3));

            for (int index = 0; index < _stores.Count; index++)
            {
                var _cache = new AssetCache((Dictionary<string, object>)_stores.ElementAt(index));
                Assert.That(_cache, Has.Count.EqualTo(2));
            }
        }

        #endregion
    }
}
