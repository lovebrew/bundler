using System.Diagnostics;

using Microsoft.AspNetCore.Mvc;

namespace Bundler.Server.Models
{
    public class BundlerQuery
    {
        [FromQuery(Name = "title")]
        public string Title { get; set; } = "SuperGame";
        [FromQuery(Name = "author")]
        public string Author { get; set; } = "SuperAuthor";
        [FromQuery(Name = "description")]
        public string Description { get; set; } = "SuperDescription";
        [FromQuery(Name = "version")]
        public string Version { get; set; } = "0.1.0";
        [FromQuery(Name = "targets")]
        public string Targets { get; set; }

        public ProcessStartInfo GetSMDHCommand(string directory, string iconPath) 
        {
            var output = Path.Join(directory, this.Title);
            Console.WriteLine($"Creating SMDH for {output}");

            var description = $"{this.Description} - {this.Version}";
            
            Console.WriteLine($"Description: {description}");
            Console.WriteLine($"Author: {this.Author}");
            Console.WriteLine($"Icon: {iconPath}");

            var arguments = $"--create \"{this.Title}\" \"{description}\" \"{this.Author}\" \"{iconPath}\" \"{output}.smdh\"";

            return new ProcessStartInfo { FileName = "smdhtool", Arguments = arguments };
        }

        public ProcessStartInfo Get3DSXCommand(string directory, string binaryPath, string romfsPath)
        {
            var output = Path.Join(directory, this.Title);
            var arguments = $"\"{binaryPath}\" \"{output}.3dsx\" --smdh=\"{output}.smdh\" --romfs=\"{romfsPath}\"";

            return new ProcessStartInfo { FileName = "3dsxtool", Arguments = arguments };
        }

        public ProcessStartInfo GetNACPCommand(string directory)
        {
            var output = Path.Join(directory, this.Title);
            var arguments = $"--create \"{this.Title}\" \"{this.Author}\" \"{this.Version}\" \"{output}.nacp\"";

            return new ProcessStartInfo { FileName = "nacptool", Arguments = arguments };
        }

        public ProcessStartInfo GetNROCommand(string directory, string binaryPath, string iconPath, string romfsPath)
        {
            var output = Path.Join(directory, this.Title);
            var arguments = $"\"{binaryPath}\" \"{output}.nro\" --nacp=\"{output}.nacp\" --icon=\"{iconPath}\" --romfs=\"{romfsPath}\"";

            return new ProcessStartInfo { FileName = "elf2nro", Arguments = arguments };
        }

        public ProcessStartInfo GetRPLCommand(string directory, string binaryPath)
        {

            var output = Path.Join(directory, this.Title);
            var arguments = $"\"{binaryPath}\" {output}.rpx";

            return new ProcessStartInfo { FileName = "elf2rpl", Arguments = arguments };
        }

        public ProcessStartInfo GetWUHBCommand(string directory, string iconPath, string romfsPath)
        {
            var output = Path.Join(directory, this.Title);
            var arguments = $"\"{output}.rpx\" \"{output}.wuhb\" --content=\"{romfsPath}\" --name=\"{this.Title}\" --short-name=\"{this.Title}\" --author=\"{this.Author}\" --icon=\"{iconPath}\"";

            return new ProcessStartInfo { FileName = "wuhbtool", Arguments = arguments };
        }
    }
}