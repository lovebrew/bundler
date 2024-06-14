using Newtonsoft.Json;

namespace Bundler.Server.Models
{
    /// <summary>
    /// Information about the server
    /// </summary>
    public class BundlerInfo
    {
        /// <value>Server Deployment Time</value>
        public string Deployed { get; set; } = default!;
        /// <value>Server Time</value>
        [JsonProperty(PropertyName = "Server Time")]
        public string ServerTime { get; set; } = default!;
        /// <value>Binaries last modified time</value>
        [JsonProperty(PropertyName = "Last Modified")]
        public Dictionary<string, string> LastModified { get; set; } = default!;
        /// <value>Server Uptime</value>
        public string Uptime { get; set; } = default!;
        /// <value>Server Version</value>
        public string Version { get; set; } = "0.11.0";

        /// <summary>
        /// Converts the object to a JSON string
        /// </summary>
        /// <returns>string</returns>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this, Formatting.Indented);
        }
    }
}
