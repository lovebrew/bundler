using System.Reflection;
using System.IO.Compression;
using System.Text.RegularExpressions;

using Bundler.Server.Models;

using Octokit;

namespace Bundler
{
    /// <summary>
    /// Bundler resources
    /// </summary>
    public partial class Resources
    {
        private static readonly string AssemblyLocation = Assembly.GetExecutingAssembly().Location;
        private static readonly string AssemblyDirectory = Path.GetDirectoryName(AssemblyLocation);
        private static readonly string ResourcesDirectory = Path.Join(AssemblyDirectory, "Resources");
        private static readonly string DownloadsDirectory = Path.Join(AssemblyDirectory, "Downloads");
        private static readonly List<string> SkipFiles = [".3dsx", ".nro", ".wuhb"];

        /// <summary>
        /// Data for the bundler
        /// </summary>
        public static readonly Dictionary<string, BundlerData> Data = new()
        {
            { "ctr", new()
                {
                    Icon = GetResourcePath("ctr", "icon.png"),
                    Binary = GetResourcePath("ctr", "lovepotion.elf"),
                    RomFS = GetResourcePath("ctr", "files.romfs")
                }
            },
            { "hac", new()
                {
                    Icon = GetResourcePath("hac", "icon.jpg"),
                    Binary = GetResourcePath("hac", "lovepotion.elf"),
                    RomFS = GetResourcePath("hac", "files.romfs")
                }
            },
            { "cafe", new()
                {
                    Icon = GetResourcePath("cafe", "icon.png"),
                    Binary = GetResourcePath("cafe", "lovepotion.elf"),
                    RomFS = GetResourcePath("cafe", "content")
                }
            }
        };

        [GeneratedRegex(@"Nintendo\.(\w+\.?\w+?)")]
        private static partial Regex AssetRegex();

        private static string GetResourcePath(string subfolder, string filename)
            => Path.Join(ResourcesDirectory, subfolder, filename);

        private static async Task<List<ReleaseAsset>> CheckRepositoryReleases(string repository, string? excluded = null)
        {
            if (!Directory.Exists(DownloadsDirectory)) Directory.CreateDirectory(DownloadsDirectory);

            var github = new GitHubClient(new ProductHeaderValue("Bundler"));

            var release = await github.Repository.Release.GetLatest("lovebrew", repository);
            Console.WriteLine($"Downloading assets for {repository}");

            var assets = await github.Repository.Release.GetAllAssets("lovebrew", repository, release.Id);

            if (excluded is not null)
                assets = assets.TakeWhile(x => !x.Name.Contains(excluded)).ToList();

            return [.. assets];
        }

        private static async Task<string> DownloadAsset(ReleaseAsset asset, string? excluded = null)
        {
            var assetPath = Path.Join(DownloadsDirectory, asset.Name);
            if (Path.Exists(assetPath)) return assetPath;

            using var client = new HttpClient();

            using var stream = await client.GetStreamAsync(asset.BrowserDownloadUrl);
            using var fileStream = File.Create(assetPath);
            stream.CopyTo(fileStream);

            Console.WriteLine($"Downloaded {asset.Name}");
            return assetPath;
        }

        private static void UnpackResources(string assetsZip, string console = "")
        {
            if (!Directory.Exists(ResourcesDirectory)) Directory.CreateDirectory(ResourcesDirectory);

            using var zip = ZipFile.OpenRead(assetsZip);
            foreach (var entry in zip.Entries)
            {
                if (SkipFiles.Contains(Path.GetExtension(entry.FullName))) continue;

                var path = Path.Join(ResourcesDirectory, console, entry.FullName);

                if (entry.FullName.EndsWith('/'))
                {
                    Directory.CreateDirectory(path);
                    continue;
                }
                else if (!Directory.Exists(Path.GetDirectoryName(path)))
                    Directory.CreateDirectory(Path.GetDirectoryName(path));

                using var stream = entry.Open();
                using var fileStream = System.IO.File.Create(path);
                stream.CopyTo(fileStream);
            }
        }

        private static string GetConsoleName(string name)
        {
            var consoleMatch = AssetRegex().Match(name);

            if (consoleMatch.Success)
            {
                var consoleName = consoleMatch.Groups[1].Value;

                return consoleName switch
                {
                    "3DS" => "ctr",
                    "Switch" => "hac",
                    "Wii.U" => "cafe",
                    _ => throw new ArgumentException($"Invalid console {consoleName}")
                };
            }

            return string.Empty;
        }

        private static async Task<List<ReleaseAsset>> CheckBinaryReleases()
        {
            var releases = await CheckRepositoryReleases("lovepotion");
            var result = new List<ReleaseAsset>();

            foreach (var asset in releases)
            {
                var console = GetConsoleName(asset.Name);

                if (string.IsNullOrEmpty(console)) continue;

                if (!Path.Exists(Data[console].Binary))
                    result.Add(asset);
                else
                {
                    var timestamp = new FileInfo(Data[console].Binary).LastWriteTime;
                    if (timestamp < asset.UpdatedAt) result.Add(asset);
                }
            }

            return result;
        }

        /// <summary>
        /// Retrieves the timestamp of the specified binary
        /// </summary>
        public static string GetTimestamp(string key)
        {
            if (Data.TryGetValue(key, out var data))
                return data.Timestamp;

            return string.Empty;
        }

        /// <summary>
        /// Downloads the latest assets from the repository
        /// </summary>
        public static async Task Download()
        {
            bool shouldDownload = Data.Values.Any(data => !Path.Exists(data.RomFS) || !Path.Exists(data.Icon));
            var resources = new List<ReleaseAsset>();

            if (shouldDownload)
            {
                resources = await CheckRepositoryReleases("bundler");
                var path = await DownloadAsset(resources[0]);

                UnpackResources(path);
                Console.WriteLine("RomFS and Icon data have been downloaded and unpacked");
            }

            resources = await CheckBinaryReleases();

            if (resources.Count > 0)
            {
                foreach (var asset in resources)
                {
                    var path = await DownloadAsset(asset);
                    var console = GetConsoleName(asset.Name);

                    UnpackResources(path, console);
                }

                Console.WriteLine("Binary data has been downloaded and unpacked");
            }

            if (!shouldDownload && resources.Count == 0) Console.WriteLine("All resources are up to date");
            if (Directory.Exists(DownloadsDirectory)) Directory.Delete(DownloadsDirectory, true);
        }
    }
}
