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
        private readonly ProcessStartInfo imageCommand = new() { FileName = "tex3ds", Arguments = "-f rgba8888 -z auto \"{0}\" -o \"{1}\"" };
        private const int MaxImageSize = 1024;
        private const int MinImageSize = 3;

        private static readonly List<string> FontMimeTypes = ["font/ttf", "font/otf"];
        private readonly ProcessStartInfo fontCommand = new() { FileName = "mkbcfnt", Arguments = "\"{0}\" -o \"{1}\"" };

        private static string TransformExtension(string filename, bool isFont)
            => Path.ChangeExtension(filename, isFont ? ".bcfnt" : ".t3x");

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

        private bool IsValidMediaFile(string filepath, bool isFont)
        {
            var filename = Path.GetFileName(filepath);

            try
            {
                if (isFont)
                {
                    using var file = System.IO.File.OpenRead(filepath);
                    return FontDescription.LoadDescription(file) != null;
                }

                using var image = Image.Load(filepath);

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
            }
            catch (Exception e)
            {
                this._logger.LogError($"Error loading '{filename}': {e.Message}");
            }

            return false;
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

                /* save the file to a temporary location */
                var tempName = Path.Join(tempDirectory, name);
                using var stream = new FileStream(tempName, FileMode.Create);
                file.CopyTo(stream);
                stream.Close();

                bool isFont = FontMimeTypes.Contains(mimeType);

                if (!IsValidMediaFile(tempName, isFont))
                {
                    partial = true;
                    continue;
                }

                var command = isFont ? fontCommand : imageCommand;

                /* make the destination name */
                var convertedName = TransformExtension(name, isFont);
                var tempConvertedName = Path.Join(tempDirectory, convertedName);

                command.Arguments = string.Format(command.Arguments, tempName, tempConvertedName);
                this._logger.LogInformation($"Converting {name} to {convertedName}..");

                using var process = new Process { StartInfo = command };
                {
                    if (!process.Start())
                        this._logger.LogError($"Failed to start process {command.FileName}");
                    else
                        process.WaitForExit();
                }

                if (process.ExitCode != 0)
                {
                    partial = true;
                    this._logger.LogError($"Error converting {name} to {convertedName}");
                }
                else
                {
                    this._logger.LogInformation($"Converted {name} to {convertedName} successfully.");
                    fileData.Add(convertedName, GetBase64FromContent(tempConvertedName));
                }
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
