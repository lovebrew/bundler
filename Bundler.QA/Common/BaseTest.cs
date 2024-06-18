using System;
using System.IO.Compression;
using System.Text;

using Tomlyn;

namespace Bundler.QA.Common
{
    public sealed class BundleFile
    {
        /// <value>Asset Name</value>
        public string? FileName { get; set; }
        /// <value>Asset Data (Bytes)</value>
        public byte[]? Data { get; set; }
        /// <value>Zip Entry Path</value>
        public string EntryPath { get; set; }
    }

    public class BaseTest
    {
        protected static string GenerateRandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var random = new Random();
            var stringBuilder = new StringBuilder(length);

            for (int i = 0; i < length; i++) stringBuilder.Append(chars[random.Next(chars.Length)]);

            return stringBuilder.ToString();
        }

        protected static byte[] GenerateRandomStringBytes(int length)
        {
            return Encoding.UTF8.GetBytes(GenerateRandomString(length));
        }

        public static string CreateBundle(string name, Span<BundleFile> files)
        {
            ArgumentNullException.ThrowIfNullOrWhiteSpace(name, nameof(name));

            using var bundle = ZipFile.Open(name, ZipArchiveMode.Create);

            foreach (var file in files)
            {
                ArgumentNullException.ThrowIfNull(file.EntryPath, nameof(file.EntryPath));

                if (file.Data is null)
                {
                    ArgumentNullException.ThrowIfNullOrWhiteSpace(file.FileName, nameof(file.FileName));
                    bundle.CreateEntryFromFile(Assets.GetFilepath(file.FileName), file.EntryPath);
                }
                else
                {
                    var entry = bundle.CreateEntry(file.EntryPath, CompressionLevel.Optimal);
                    using var stream = entry.Open();
                    stream.Write(file.Data, 0, file.Data.Length);
                }
            }

            return Path.Join(Directory.GetCurrentDirectory(), name);
        }

        public static Config LoadConfig(string filepath)
        {
            try
            {
                var toml = File.ReadAllText(filepath);
                return Toml.ToModel<Config>(toml);
            }
            catch (FileNotFoundException)
            {
                Console.WriteLine($"File not found: {filepath}");
            }
            catch (TomlException e)
            {
                Console.WriteLine($"Error parsing TOML: {e.Message}");
            }

            throw new Exception("Failed to load configuration file.");
        }
    }
}
