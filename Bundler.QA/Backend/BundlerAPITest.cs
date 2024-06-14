using System.Net;
using System.IO.Compression;

using Newtonsoft.Json;

using Bundler.QA.Common;
using Bundler.Server.Models;

namespace Bundler.QA.Backend
{
    [NonParallelizable]
    internal class BundlerAPITest : BaseTest
    {
        private HttpClient _client;

        [OneTimeSetUp]
        public void Setup()
            => this._client = new() { BaseAddress = new Uri("http://localhost:5001") };

        [OneTimeTearDown]
        public void Teardown()
            => this._client.Dispose();

        private static string ChangeExtension(string filename)
        {
            return Path.GetExtension(filename) switch
            {
                ".png" or ".jpg" or ".jpeg" => Path.ChangeExtension(filename, ".t3x"),
                ".otf" or ".ttf" => Path.ChangeExtension(filename, ".bcfnt"),
                _ => filename
            };
        }

        private static void ValidateZipArchive(string console, string base64, string[] filenames)
        {
            Console.WriteLine($"Validating {console} archive...");

            if (console == "ctr") // change extensions based on file extension (png, jpg, ttf)
                filenames = Array.ConvertAll(filenames, f => ChangeExtension(f));

            var bytes = Convert.FromBase64String(base64);
            using var stream = new MemoryStream(bytes);

            using var zip = new ZipArchive(stream);

            Assert.That(zip.Entries, Has.Count.EqualTo(filenames.Length));

            foreach (var filename in filenames)
                Assert.That(zip.Entries, Has.One.Matches<ZipArchiveEntry>(e => e.Name == filename));
        }

        #region Textures

        [TestCase("dio.jpg")]
        [TestCase("lenny.png")]
        [Description("Test valid texture files (jpg, png) can upload (within size limits).")]
        public async Task TestTextureConversion(string filename)
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData(filename));

            content.Add(fileBytes, filename, filename);
            var response = await this._client.PostAsync("convert", content);

            var json = JsonConvert.DeserializeObject(await response.Content.ReadAsStringAsync());
            var expected = Path.ChangeExtension(filename, "t3x");

            Assert.Multiple(() => {
                Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
                Assert.That(json, Contains.Key("log"));
                Assert.That(json, Contains.Key(expected));
            });
        }

        [TestCase("cat_big_width.png")]
        [TestCase("cat_big_height.png")]
        [TestCase("cat_big_both.png")]
        [TestCase("cat_big_width.jpg")]
        [TestCase("cat_big_height.jpg")]
        [TestCase("cat_big_both.jpg")]
        [Description("Test large texture files cannot upload (> 1024 pixels).")]
        public async Task TestUploadBigTextureDimensions(string filename)
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData(filename));

            content.Add(fileBytes, filename, filename);
            var response = await this._client.PostAsync("convert", content);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));
        }

        [TestCase("small_both.png")]
        [TestCase("small_height.png")]
        [TestCase("small_width.png")]
        [TestCase("small_both.jpg")]
        [TestCase("small_height.jpg")]
        [TestCase("small_width.jpg")]
        [Description("Test small texture files cannot upload (< 3 pixels).")]
        public async Task TestUploadSmallFileDimensions(string filename)
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData(filename));

            content.Add(fileBytes, filename, filename);
            var response = await this._client.PostAsync("convert", content);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));
        }

        [TestCase]
        [Description("Test 'corrupt' texture files cannot upload.")]
        public async Task TestUploadCorruptTexture()
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData("corrupt.png"));

            content.Add(fileBytes, "corrupt.png", "corrupt.png");
            var response = await this._client.PostAsync("convert", content);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));
        }

        [TestCase("chika.gif")]
        [TestCase("rectangle.bmp")]
        [TestCase("rectangle.tga")]
        [Description("Test invalid file types cannot upload.")]
        public async Task TestUploadInvalidTexture(string filename)
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData(filename));

            content.Add(fileBytes, filename, filename);
            var response = await this._client.PostAsync("convert", content);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnsupportedMediaType));
        }

        #endregion

        #region Fonts

        [TestCase("Oneday.otf")]
        [TestCase("Perfect DOS VGA 437.ttf")]
        public async Task TestFontConversion(string filename)
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData(filename));

            content.Add(fileBytes, filename, filename);
            var response = await this._client.PostAsync("convert", content);

            var json = JsonConvert.DeserializeObject(await response.Content.ReadAsStringAsync());
            var expected = Path.ChangeExtension(filename, "bcfnt");

            Assert.Multiple(() => {
                Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
                Assert.That(json, Contains.Key("log"));
                Assert.That(json, Contains.Key(expected));
            });
        }

        [TestCase]
        [Description("Test 'corrupt' font files cannot upload.")]
        public async Task TestUploadCorruptFont()
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData("corrupt.ttf"));

            content.Add(fileBytes, "corrupt.ttf", "corrupt.ttf");
            var response = await this._client.PostAsync("convert", content);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));
        }

        [TestCase]
        [Description("Test invalid font files cannot upload.")]
        public async Task TestUploadInvalidFont()
        {
            var content = new MultipartFormDataContent();
            var fileBytes = new ByteArrayContent(Assets.GetData("arial.fnt"));

            content.Add(fileBytes, "arial.fnt", "arial.fnt");
            var response = await this._client.PostAsync("convert", content);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        }

        #endregion

        #region Bundles

        [TestCase("bundle-macOS.zip")]
        [Description("Test uploading a bundle *directly* to /compile works")]
        public async Task TestUploadBundle(string filename)
        {
            var content = new MultipartFormDataContent();

            var fileBytes = new ByteArrayContent(Assets.GetData(filename));
            content.Add(fileBytes, filename, filename);

            BundlerQuery query = new()
            {
                Title = "Test Bundle",
                Description = "Test Bundle Description",
                Author = "Test Author",
                Version = "1.0.0",
                Targets = "ctr,hac,cafe"
            };
            
            var response = await this._client.PostAsync($"compile?{query}", content);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        }

        /* super basic test, there's what, 120 possible combinations? */
        [TestCase("Hello", "World", "MEMES", "0.1.0", "")]
        [TestCase("Hello", "World", "MEMES", "", "ctr,cafe,hac")]
        [TestCase("Hello", "World", "", "0.1.0", "ctr,cafe,hac")]
        [TestCase("Hello", "", "MEMES", "0.1.0", "ctr,cafe,hac")]
        [TestCase("", "World", "MEMES", "0.1.0", "ctr,cafe,hac")]
        [TestCase("", "", "", "", "")]
        [Description("Doing a POST request to /compile without a completed query should return a 400")]
        public async Task TestUploadBundleNoCompleteQuery(string title, string description, string author, string version, string targets)
        {
            BundlerQuery query = new()
            {
                Title = title,
                Description = description,
                Author = author,
                Version = version,
                Targets = targets
            };

            var response = await this._client.PostAsync($"compile?{query}", new MultipartFormDataContent());

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        }

        #endregion
    }
}
