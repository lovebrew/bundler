namespace Bundler.Server.Models
{
    public class BundlerData
    {
        public string Icon { get; set; }
        public string RomFS { get; set; }
        public string Binary { get; set; }

        public void Validate()
        {
            if (!Path.Exists(Icon))
                throw new Exception($"Icon file not found: {Icon}");

            if (!Path.Exists(RomFS))
                throw new Exception($"RomFS file not found: {RomFS}");

            if (!Path.Exists(Binary))
                throw new Exception($"Binary file not found: {Binary}");
        }
    }
}