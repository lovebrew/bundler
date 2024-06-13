using System.Linq;

namespace Bundler.QA.Common
{
    public class Assets
    {
        private const string ResourcesPath = "Resources";
        private static Assets? _instance = null;

        private readonly Dictionary<string, byte[]> AssetData = [];
        private readonly Dictionary<string, Dictionary<string, byte[]>> AssetCollections = [];

        private Assets()
        {
            foreach (var file in Directory.GetFiles(ResourcesPath, "*", SearchOption.AllDirectories))
            {
                var (name, data) = (Path.GetFullPath(file), File.ReadAllBytes(file));
                this.AssetData.Add(name, data);
            }
        }

        public static Assets Instance()
            => _instance ??= new();

        public string GetFilepath(string name)
        {
            var filepath = this.AssetData.Keys.FirstOrDefault(k => k.Contains(name));
            return filepath is null ? throw new FileNotFoundException($"File not found: {name}") : filepath;
        }

        public byte[] GetData(string name)
        {
            return this.AssetData[name];
        }
    }
}
