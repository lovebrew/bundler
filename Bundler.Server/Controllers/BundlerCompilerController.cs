using System.Diagnostics;

using Microsoft.AspNetCore.Mvc;

using SixLabors.ImageSharp;

using Bundler.Server.Models;

namespace Bundler.Server.Controllers
{
    /// <summary>
    /// Controller for compiling bundles
    /// </summary>
    [ApiController]
    [Route("compile")]
    public partial class BundlerCompileController : ControllerBase
    {
        private readonly Logger _logger;
        private readonly Dictionary<string, ushort> ConsoleIconDimensions = new() { {"ctr", 48 }, { "hac", 256 }, { "cafe", 128 }};

        /// <summary>
        /// Initializes a new instance of the <see cref="BundlerCompileController"/> class.
        /// </summary>
        public BundlerCompileController()
        {
            this._logger = new();
        }

        private static string GetBase64FromContent(string filepath)
            => Convert.ToBase64String(System.IO.File.ReadAllBytes(filepath));

        private bool RunProcess(ProcessStartInfo info, string filename)
        {
            using Process process = new() { StartInfo = info };

            if (!process.Start())
            {
                this._logger.LogError($"Failed to start {info.FileName}");
                return false;
            }
            else
                process.WaitForExit();

            if (Path.Exists(filename)) return true;

            this._logger.LogError($"Failed to create {filename}");
            return false;
        }

        private string Compile(string directory, string console, BundlerQuery query, string iconPath)
        {
            var path = Path.Join(directory, query.Title);
            var data = Resources.Data[console];

            (ProcessStartInfo info, string extension) = console switch
            {
                "ctr" => (query.GetSMDHCommand(directory, iconPath), "smdh"),
                "hac" => (query.GetNACPCommand(directory), "nacp"),
                "cafe" => (query.GetRPLCommand(directory, data.Binary), "rpx"),
                _ => throw new NotImplementedException()
            };
            
            if (!RunProcess(info, $"{path}.{extension}")) return string.Empty;

            (info, extension) = console switch
            {
                "ctr" => (query.Get3DSXCommand(directory, data.Binary, data.RomFS), "3dsx"),
                "hac" => (query.GetNROCommand(directory, data.Binary, iconPath, data.RomFS), "nro"),
                "cafe" => (query.GetWUHBCommand(directory, iconPath, data.RomFS), "wuhb"),
                _ => throw new NotImplementedException()
            };

            if (!RunProcess(info, $"{path}.{extension}")) return string.Empty;

            return GetBase64FromContent(Path.Join(directory, $"{query.Title}.{extension}"));
        }

        private static bool ValidateIcon(string console, string mimeType)
        {
            Console.WriteLine($"Validating icon: {console} ({mimeType})");
            return console switch
            {
                "ctr" or "cafe" => mimeType == "image/png",
                "hac" => mimeType == "image/jpeg" || mimeType == "image/jpg",
                _ => false
            };
        }

        private (int, string) CheckIcon(string path, string target)
        {
            try
            {
                if (MimeTypes.TryGetMimeType(path, out var mimeType))
                {
                    using var image = Image.Load(path);

                    var dimensions = ConsoleIconDimensions[target];
                    int[] imageDimensions = [image.Width, image.Height];

                    if (!imageDimensions.All((dimension) => dimension == dimensions))
                        return (StatusCodes.Status422UnprocessableEntity, $"Invalid icon dimensions for {target}.");

                    if (!ValidateIcon(target, mimeType))
                        return (StatusCodes.Status422UnprocessableEntity, $"Invalid icon mimetype for {target}.");
                    else
                        this._logger.LogInformation($"Using custom icon for {target}");
                }
                else
                    return (StatusCodes.Status422UnprocessableEntity, $"Icon for {target} has no mimetype.");
            }
            catch (Exception exception)
            {
                var message = $"An error occurred while processing the icon for {target}.";
                if (exception is ImageFormatException)
                    message = $"Invalid icon format for {target}.";
                
                return (StatusCodes.Status422UnprocessableEntity, message);
            }

            return (StatusCodes.Status200OK, string.Empty);
        }

        /// <summary>
        /// Compiles the specified targets
        /// </summary>
        [HttpPost]
        public IActionResult Post([FromQuery] BundlerQuery? query)
        {
            if (query is null)
                return BadRequest("No query specified");

            var files = this.HttpContext.Request.Form.Files;

            /* remove duplicate entries */
            List<string> targets = query.Targets.Split(",").Distinct().ToList();

            if (targets.Count == 0)
                return BadRequest("No targets specified");

            string tempDirectory = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDirectory);

            if (!Directory.Exists(tempDirectory))
                return StatusCode(StatusCodes.Status500InternalServerError);

            Dictionary<string, string> fileData = [];
            bool partial = false;

            foreach (var target in targets)
            {
                if (!Resources.Data.TryGetValue(target, out var data))
                {
                    this._logger.LogError($"Invalid target: {target}");
                    continue;
                }

                /* sub folder for specific target */
                string directory = Path.Combine(tempDirectory, target);
                Directory.CreateDirectory(directory);

                this._logger.LogInformation($"Creating {target} bundle for {query.Title}");

                var iconPath = Path.GetFullPath(data.Icon);
                var originalPath = iconPath;

                /* save the custom icon, if it exists */

                IFormFile? icon = files.FirstOrDefault((x) => x.Name == $"icon-{target}");
                
                if (icon is not null)
                {                
                    var customIconPath = Path.Join(directory, icon.FileName);
                    using var stream = new FileStream(customIconPath, FileMode.Create);
                    icon.CopyTo(stream);
                    stream.Dispose();

                    var (statusCode, message) = CheckIcon(customIconPath, target);
                    if (statusCode != StatusCodes.Status200OK) 
                        return StatusCode(statusCode, message);
                    else
                        iconPath = customIconPath;
                }

                var content = Compile(directory, target, query, iconPath);

                this._logger.LogInformation($"--- [END] ---");

                if (string.IsNullOrEmpty(content))
                {
                    partial = true;
                    continue;
                }

                fileData.Add(target, content);
            }

            fileData.Add("log", this._logger.GetLogs());

            Directory.Delete(tempDirectory, true);

            if (partial)
            {
                var code = targets.Count == 1 ? StatusCodes.Status422UnprocessableEntity : StatusCodes.Status206PartialContent;
                return StatusCode(code, fileData);
            }

            return Ok(fileData);
        }
    }
}
