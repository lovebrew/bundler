using Microsoft.AspNetCore.Mvc;

using Bundler.Server.Models;

namespace Bundler.Server.Controllers
{
    /// <summary>
    /// Controller for retrieving server information
    /// </summary>
    [ApiController]
    [Route("info")]
    public class BundlerInfoController : ControllerBase
    {
        private static readonly BundlerInfo _info = new()
        {
            Deployed = DateTime.Now.ToString("R"),
            LastModified = new Dictionary<string, string>
            {
                { "CTR",  Resources.Data["ctr"].Timestamp  },
                { "HAC",  Resources.Data["hac"].Timestamp  },
                { "CAFE", Resources.Data["cafe"].Timestamp }
            }
        };

        /// <summary>
        /// Returns server information
        /// </summary>
        [HttpGet]
        public string Get()
        {
            _info.ServerTime = DateTime.Now.ToString("R");
            _info.Uptime = (DateTime.Parse(DateTime.Now.ToString("R")) - DateTime.Parse(_info.Deployed)).ToString();

            return _info.ToString();
        }
    }
}
