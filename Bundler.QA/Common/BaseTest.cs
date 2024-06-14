using System.IO.Compression;

namespace Bundler.QA.Common
{
    public class BaseTest
    {
        public static void CreateBundle(string name, Span<(string name, string path)> files)
        {
            using var bundle = ZipFile.Open(name, ZipArchiveMode.Create);
            foreach (var file in files) bundle.CreateEntryFromFile(Assets.GetFilepath(file.name), file.path);
        }
    }
}
