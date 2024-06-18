using System.Net;
using System.IO.Compression;

using Newtonsoft.Json;

using Bundler.QA.Common;
using Bundler.Server.Models;

namespace Bundler.QA.Backend
{
    using BundlerResponse = Dictionary<string, string>;

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

        [TestCase("ctr",  "lenny.png")]
        [TestCase("hac",  "dio.jpg")]
        [TestCase("cafe", "cat_big_both.png")]
        public async Task TestUploadBundleWithCustomIconBadDimensions(string target, string filename)
        {
            BundlerQuery query = new()
            {
                Title = "SuperGame",
                Description = "SuperDescription",
                Author = "SuperAuthor",
                Version = "0.1.0",
                Targets = target
            };

            var content = new MultipartFormDataContent();

            var fileBytes = new ByteArrayContent(Assets.GetData(filename));
            content.Add(fileBytes, $"icon-{target}", filename);

            var response = await this._client.PostAsync($"compile?{query}", content);
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));

            var info = await response.Content.ReadAsStringAsync();
            Assert.That(info, Is.EqualTo($"Invalid icon dimensions for {target}."));
        }

        [TestCase("ctr")]
        [TestCase("hac")]
        [TestCase("cafe")]
        [Description("Validate that uploading a bundle with a bad icon mimetype throws an error.")]
        public async Task TestUploadBundleWithCustomIconBadMimetype(string target)
        {
            string filename = "empty";

            BundlerQuery query = new()
            {
                Title = "SuperGame",
                Description = "SuperDescription",
                Author = "SuperAuthor",
                Version = "0.1.0",
                Targets = target
            };

            var content = new MultipartFormDataContent();

            var fileBytes = new ByteArrayContent(Assets.GetData(filename));
            content.Add(fileBytes, $"icon-{target}", filename);

            var response = await this._client.PostAsync($"compile?{query}", content);
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));

            var info = await response.Content.ReadAsStringAsync();
            Assert.That(info, Is.EqualTo($"Icon for {target} has no mimetype."));
        }

        [TestCase("ctr",  "corrupt.png")]
        [TestCase("hac",  "corrupt.jpg")]
        [TestCase("cafe", "corrupt.png")]
        [Description("Validate that uploading a bundle with a valid icon mimetype but invalid data throws an error.")]
        public async Task TestUploadBundleWithCustomIconInvalidImage(string target, string filename)
        {
            BundlerQuery query = new()
            {
                Title = "SuperGame",
                Description = "SuperDescription",
                Author = "SuperAuthor",
                Version = "0.1.0",
                Targets = target
            };

            var content = new MultipartFormDataContent();

            var fileBytes = new ByteArrayContent(Assets.GetData(filename));
            content.Add(fileBytes, $"icon-{target}", filename);

            var response = await this._client.PostAsync($"compile?{query}", content);
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));

            var info = await response.Content.ReadAsStringAsync();
            Assert.That(info, Is.EqualTo($"Invalid icon format for {target}."));
        }

        [TestCase("ctr")]
        [TestCase("hac")]
        [TestCase("cafe")]
        [Description("Validate that uploading a bundle with a bad icon mimetype throws an error.")]
        public async Task TestUploadBundleWithCustomIconIncorrectMimetype(string target)
        {
            string filename = "yeetus.txt";

            BundlerQuery query = new()
            {
                Title = "SuperGame",
                Description = "SuperDescription",
                Author = "SuperAuthor",
                Version = "0.1.0",
                Targets = target
            };

            var content = new MultipartFormDataContent();

            var fileBytes = new ByteArrayContent(Assets.GetData(filename));
            content.Add(fileBytes, $"icon-{target}", filename);

            var response = await this._client.PostAsync($"compile?{query}", content);
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));

            var info = await response.Content.ReadAsStringAsync();
            Assert.That(info, Is.EqualTo($"Invalid icon format for {target}."));
        }

        [TestCase("ctr", "icon-ctr.png")]
        [TestCase("hac", "icon-hac.jpg")]
        public async Task TestUploadBundleWithCustomIcon(string target, string filename)
        {
            BundlerQuery query = new()
            {
                Title = "SuperGame",
                Description = "SuperDescription",
                Author = "SuperAuthor",
                Version = "0.1.0",
                Targets = target
            };

            var content = new MultipartFormDataContent();

            var fileBytes = new ByteArrayContent(Assets.GetData(filename));
            content.Add(fileBytes, $"icon-{target}", filename);

            var response = await this._client.PostAsync($"compile?{query}", content);
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));

            var json = JsonConvert.DeserializeObject<BundlerResponse>(await response.Content.ReadAsStringAsync());
            Assert.That(json, Is.Not.Null);

            var bytes = Convert.FromBase64String(json[target]);

            var expected = target == "ctr" ? Assets.GetData("icon_big.bin") : Assets.GetData(filename);
            Assert.That(bytes.Intersect(expected), Is.Not.Empty);
        }

        #endregion
    }
}
