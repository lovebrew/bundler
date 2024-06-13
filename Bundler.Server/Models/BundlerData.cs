namespace Bundler.Server.Models
{
    /// <summary>
    /// Represents the data for the bundler
    /// </summary>
    public class BundlerData
    {
        /// <value>Application Icon path</value>
        public string Icon { get; set; } = default!;
        /// <value>Application RomFS path</value>
        public string RomFS { get; set; } = default!;
        /// <value>Application Binary (ELF) path</value>
        public string Binary { get; set; } = default!;
        /// <value>Application Binary Timestamp</value>
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
