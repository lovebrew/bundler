using Newtonsoft.Json;

namespace Bundler.Server.Models
{
    public class BundlerInfo
    {
        public string Deployed { get; set; }
        [JsonProperty(PropertyName = "Server Time")]
        public string ServerTime { get; set; }
        [JsonProperty(PropertyName = "Last Modified")]
        public Dictionary<string, string> LastModified { get; set; }
        public string Uptime { get; set; }
        public string Version { get; set; } = "0.11.0";

        public new string ToString()
            => JsonConvert.SerializeObject(this, Formatting.Indented);
    }
}
