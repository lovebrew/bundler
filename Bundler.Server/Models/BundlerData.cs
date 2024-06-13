namespace Bundler.Server.Models
{
    public class BundlerData
    {
        public string Icon { get; set; }
        public string RomFS { get; set; }
        public string Binary { get; set; }
        public string Timestamp
        {
            get
            {
                if (Path.Exists(this.Binary))
                    return new FileInfo(this.Binary).LastWriteTime.ToString("R");
                else
                    return "Unknown";
            }
        }
    }
}
