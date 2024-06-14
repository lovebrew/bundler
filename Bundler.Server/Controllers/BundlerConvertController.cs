using System.Diagnostics;

using Microsoft.AspNetCore.Mvc;

using SixLabors.Fonts;
using SixLabors.ImageSharp;

namespace Bundler.Server.Controllers
{
    /// <summary>
    /// Controller for converting media files
    /// </summary>
    [ApiController]
    [Route("convert")]
    public class BundlerConvertController : ControllerBase
    {
        enum Error
        {
            Error_NoFilesUploaded,
            Error_InvalidFile,
            Error_InvalidFileType,
        };

        private static readonly List<string> ImageMimeTypes = ["image/jpg", "image/jpeg", "image/png"];
        private const int MaxImageSize = 1024;
        private const int MinImageSize = 3;

        private static readonly List<string> FontMimeTypes = ["font/ttf", "font/otf"];

        private static string GetBase64FromContent(string filepath)
            => Convert.ToBase64String(System.IO.File.ReadAllBytes(filepath));

        private readonly Logger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="BundlerConvertController"/> class.
        /// </summary>
        public BundlerConvertController()
        {
            this._logger = new();
        }

        private bool IsValidTexture(string filename)
        {
            using var image = Image.Load(filename);

            if (image != null)
            {
                if (image.Width > MaxImageSize || image.Height > MaxImageSize)
                {
                    var side = image.Width > image.Height ? "width" : "height";
                    var size = Math.Max(image.Width, image.Height);

                    this._logger.LogError($"Image '{filename}' {side} is too large ({size} pixels > 1024 pixels)");
                    return false;
                }

                if (image.Width < MinImageSize || image.Height < MinImageSize)
                {
                    var side = image.Width < image.Height ? "width" : "height";
                    var size = Math.Min(image.Width, image.Height);

                    this._logger.LogError($"Image '{filename}' {side} is too small ({size} pixels < 5 pixels)");
                    return false;
                }

                return true;
            }

            return false;
        }

        private static bool IsValidFont(string filepath)
        {
            using var file = System.IO.File.OpenRead(filepath);
            return FontDescription.LoadDescription(file) != null;
        }

        private bool IsValidMediaFile(string filepath, bool isFont)
        {
            var filename = Path.GetFileName(filepath);

            try
            {
                if (isFont) 
                    return IsValidFont(filepath); 
                
                return IsValidTexture(filepath);
            }
            catch (Exception e)
            {
                this._logger.LogError($"Error loading '{filename}': {e.Message}");
            }

            return false;
        }

        private static string GetConvertedFilename(string source, bool isFont)
        {
            if (isFont)
                return Path.ChangeExtension(source, "bcfnt");

            return Path.ChangeExtension(source, "t3x");
        }

        private static ProcessStartInfo CreateConvertCommand(string source, bool isFont)
        {
            string destination = GetConvertedFilename(source, isFont);

            if (isFont)
                return new ProcessStartInfo("mkbcfnt", $"\"{source}\" -o \"{destination}\"");

            return new ProcessStartInfo("tex3ds", $"-f rgba8888 -z auto \"{source}\" -o \"{destination}\"");
        }

        private (string, string) ConvertMediaFile(string directory, IFormFile file, bool isFont)
        {            
            var sourcePath = Path.Join(directory, file.FileName);

            if (!Path.Exists(sourcePath))
                Directory.CreateDirectory(Path.GetDirectoryName(sourcePath)!);

            /* save the source file to a temporary location */
            {
                using var stream = new FileStream(sourcePath, FileMode.Create);
                file.CopyTo(stream);
                stream.Close();
            }

            if (!IsValidMediaFile(sourcePath, isFont))
                return (string.Empty, string.Empty);

            var info = CreateConvertCommand(sourcePath, isFont);

            var convertedFilename = GetConvertedFilename(file.FileName, isFont);
            var convertedPath = Path.Join(directory, convertedFilename);

            this._logger.LogInformation($"Converting {file.FileName} to {convertedFilename}..");

            using var process = new Process { StartInfo = info };

            if (!process.Start())
            {
                this._logger.LogError($"Failed to start process {info.FileName}");
                return (string.Empty, string.Empty);
            }
            
            process.WaitForExit();

            if (!Path.Exists(convertedPath))
            {
                this._logger.LogError($"Failed to convert {file.FileName} to {convertedFilename}");
                return (string.Empty, string.Empty);
            }

            this._logger.LogInformation($"Converted {file.FileName} to {convertedFilename} successfully.");
            return (convertedFilename, GetBase64FromContent(convertedPath));
        }

        /// <summary>
        /// Converts uploaded files to the appropriate format
        /// </summary>
        [HttpPost]
        public IActionResult Post()
        {
            var files = this.HttpContext.Request.Form.Files;

            if (files == null || files.Count == 0)
                return BadRequest(Error.Error_NoFilesUploaded);

            string tempDirectory = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDirectory);

            if (!Directory.Exists(tempDirectory))
                return StatusCode(StatusCodes.Status500InternalServerError);

            Dictionary<string, string> fileData = [];
            bool partial = false;

            foreach (var file in files)
            {
                string name = file.FileName;

                if (file.Length == 0)
                    return BadRequest($"Invalid file '{name}'");

                if (!MimeTypes.TryGetMimeType(name, out var mimeType))
                    return BadRequest($"Invalid file type from '{name}'");

                if (!ImageMimeTypes.Contains(mimeType) && !FontMimeTypes.Contains(mimeType))
                    return StatusCode(StatusCodes.Status415UnsupportedMediaType);

                bool isFont = FontMimeTypes.Contains(mimeType);
                (string filename, string data) = ConvertMediaFile(tempDirectory, file, isFont);

                if (filename == string.Empty || data == string.Empty)
                {
                    partial = true;
                    continue;
                }

                fileData.Add(filename, data);
            }

            fileData.Add("log", this._logger.GetLogs());
            Directory.Delete(tempDirectory, true);

            if (partial)
            {
                var statusCode = (files.Count == 1) ? StatusCodes.Status422UnprocessableEntity : StatusCodes.Status206PartialContent;
                return StatusCode(statusCode, fileData);
            }

            return Ok(fileData);
        }
    }
}
