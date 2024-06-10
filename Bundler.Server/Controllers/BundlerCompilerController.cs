using System.Diagnostics;

using Microsoft.AspNetCore.Mvc;

using Bundler.Server.Models;

namespace Bundler.Server.Controllers
{
    [ApiController]
    [Route("compile")]
    public class BundlerCompileController : ControllerBase
    {
        private static readonly Dictionary<string, BundlerData> Data = new()
        {
            {
                "ctr", new()
                {
                    Icon = "Resources/ctr/icon.png",
                    RomFS = "Resources/ctr/files.romfs",
                    Binary = "Resources/ctr/lovepotion.elf"
                }
            },
            {
                "hac", new()
                {
                    Icon = "Resources/hac/icon.jpg",
                    RomFS = "Resources/hac/files.romfs",
                    Binary = "Resources/hac/lovepotion.elf"
                }
            },
            {
                "cafe", new()
                {
                    Icon = "Resources/cafe/icon.png",
                    RomFS = "Resources/cafe/content",
                    Binary = "Resources/cafe/lovepotion.elf"
                }
            }
        };

        private readonly Logger _logger;

        public BundlerCompileController()
        {
            this._logger = new();
        }

        public static void Validate()
        {
            foreach (var data in Data.Values)
                data.Validate();
        }

        public static string GetLastModified(string key)
        {
            return new FileInfo(Data[key].Binary).LastWriteTime.ToString("R");
        }

        private static string GetBase64FromContent(string filepath)
            => Convert.ToBase64String(System.IO.File.ReadAllBytes(filepath));

        #region Compile Methods

        private string Create3DSX(string directory, BundlerQuery query, string iconPath)
        {
            Process process;
            var path = Path.Join(directory, query.Title);

            var info = query.GetSMDHCommand(directory, iconPath);
            using (process = new Process { StartInfo = info })
            {
                if (!process.Start())
                {
                    this._logger.LogError("Failed to start smdhtool");
                    return string.Empty;
                }
                else
                    process.WaitForExit();

                if (!Path.Exists($"{path}.smdh"))
                {
                    this._logger.LogError("Failed to create SMDH");
                    return string.Empty;
                }
            }

            info = query.Get3DSXCommand(directory, Data["ctr"].Binary, Data["ctr"].RomFS);
            using (process = new Process { StartInfo = info })
            {
                if (!process.Start())
                {
                    this._logger.LogError("Failed to start 3dsxtool");
                    return string.Empty;
                }
                else
                    process.WaitForExit();

                if (!Path.Exists($"{path}.3dsx"))
                {
                    this._logger.LogError("Failed to create 3DSX");
                    return string.Empty;
                }
            }

            return GetBase64FromContent(Path.Combine(directory, $"{query.Title}.3dsx"));
        }

        private string CreateNRO(string directory, BundlerQuery query, string iconPath)
        {
            Process process;
            var path = Path.Join(directory, query.Title);

            var info = query.GetNACPCommand(directory);
            using (process = new Process { StartInfo = info })
            {
                if (!process.Start())
                {
                    this._logger.LogError("Failed to start nacptool");
                    return string.Empty;
                }
                else
                    process.WaitForExit();

                if (!Path.Exists($"{path}.nacp"))
                {
                    this._logger.LogError("Failed to create NACP");
                    return string.Empty;
                }
            }

            info = query.GetNROCommand(directory, Data["hac"].Binary, iconPath, Data["hac"].RomFS);
            using (process = new Process { StartInfo = info })
            {
                if (!process.Start())
                {
                    this._logger.LogError("Failed to start elf2nro");
                    return string.Empty;
                }
                else
                    process.WaitForExit();

                if (!Path.Exists($"{path}.nro"))
                {
                    this._logger.LogError("Failed to create NRO");
                    return string.Empty;
                }
            }

            return GetBase64FromContent(Path.Combine(directory, $"{query.Title}.nro"));
        }

        private string CreateWUHB(string directory, BundlerQuery query, string iconPath)
        {
            Process process;
            var path = Path.Join(directory, query.Title);

            var info = query.GetRPLCommand(directory, Data["cafe"].Binary);
            using (process = new Process { StartInfo = info })
            {
                if (!process.Start())
                {
                    this._logger.LogError("Failed to start elf2rpl");
                    return string.Empty;
                }
                else
                    process.WaitForExit();

                if (!Path.Exists($"{path}.rpx"))
                {
                    this._logger.LogError("Failed to create RPX");
                    return string.Empty;
                }
            }

            info = query.GetWUHBCommand(directory, iconPath, Data["cafe"].RomFS);
            using (process = new Process { StartInfo = info })
            {
                if (!process.Start())
                {
                    this._logger.LogError("Failed to start wuhbtool");
                    return string.Empty;
                }
                else
                    process.WaitForExit();

                if (!Path.Exists($"{path}.wuhb"))
                {
                    this._logger.LogError("Failed to create WUHB");
                    return string.Empty;
                }
            }

            return GetBase64FromContent(Path.Combine(directory, $"{query.Title}.wuhb"));
        }

        #endregion

        [HttpPost]
        public IActionResult Post([FromQuery] BundlerQuery query)
        {
            var files = this.HttpContext.Request.Form.Files;

            /* remove duplicate entries */
            List<string> targets = query.Targets.Split(",").Distinct().ToList();

            if (targets.Count == 0)
                return BadRequest("No targets specified");

            string tempDirectory = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDirectory);

            if (!Directory.Exists(tempDirectory))
                return StatusCode(StatusCodes.Status500InternalServerError);

            Dictionary<string, string> fileData = new();
            bool partial = false;

            foreach (var target in targets)
            {
                if (!Data.TryGetValue(target, out var data))
                {
                    this._logger.LogError($"Invalid target: {target}");
                    continue;
                }

                /* sub folder for specific target */
                string directory = Path.Combine(tempDirectory, target);
                Directory.CreateDirectory(directory);

                this._logger.LogInformation($"Creating {target} bundle for {query.Title}");

                var iconPath = Path.GetFullPath(data.Icon);

                /* save the custom icon, if it exists */

                IFormFile? icon;
                if ((icon = files.FirstOrDefault(x => x.Name == $"icon-{target}")) is not null)
                {
                    iconPath = Path.Combine(directory, icon.FileName);
                    using var stream = new FileStream(iconPath, FileMode.Create);
                    icon.CopyTo(stream);
                }

                if (icon is null)
                    this._logger.LogInformation($"Using default icon for {target}");
                else
                    this._logger.LogInformation($"Using custom icon for {target}");

                var content = string.Empty;

                switch (target)
                {
                    case "ctr":
                        content = Create3DSX(directory, query, iconPath);
                        break;
                    case "hac":
                        content = CreateNRO(directory, query, iconPath);
                        break;
                    case "cafe":
                        content = CreateWUHB(directory, query, iconPath);
                        break;
                }

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
                return StatusCode(StatusCodes.Status206PartialContent, fileData);

            return Ok(fileData);
        }
    }
}
