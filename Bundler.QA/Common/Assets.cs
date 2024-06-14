using System.IO.Compression;

namespace Bundler.QA.Common
{
    public class Assets
    {
        private const string ResourcesPath = "Resources";

        private static readonly Dictionary<string, byte[]> Data = [];
        
        static Assets()
        {
            foreach (var file in Directory.GetFiles(ResourcesPath, "*", SearchOption.AllDirectories))
            {
                var (name, data) = (Path.GetFullPath(file), File.ReadAllBytes(file));
                Data.Add(name, data);
            }
        }

        public static string GetFilepath(string name)
        {
            var filepath = Data.Keys.FirstOrDefault(k => k.Contains(name));
            return filepath is null ? throw new FileNotFoundException($"File not found: {name}") : filepath;
        }

        public static byte[] GetData(string name)
        {
            var bytes = Data.FirstOrDefault(k => k.Key.Contains(name)).Value;
            return bytes is null ? throw new FileNotFoundException($"File not found: {name}") : bytes;
        }
    }
}
