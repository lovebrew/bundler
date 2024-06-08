using Microsoft.AspNetCore.Mvc;

using Bundler.Server.Models;

namespace Bundler.Server.Controllers
{
    [ApiController]
    [Route("info")]
    public class BundlerInfoController : ControllerBase
    {
        private static readonly BundlerInfo _info = new()
        {
            Deployed = DateTime.Now.ToString("R"),
            LastModified = new Dictionary<string, string>
            {
                { "CTR",  BundlerCompileController.GetLastModified("ctr")  },
                { "HAC",  BundlerCompileController.GetLastModified("hac")  },
                { "CAFE", BundlerCompileController.GetLastModified("cafe") }
            }
        };

        [HttpGet]
        public string Get()
        {
            _info.ServerTime = DateTime.Now.ToString("R");
            _info.Uptime = (DateTime.Parse(DateTime.Now.ToString("R")) - DateTime.Parse(_info.Deployed)).ToString();
            
            return _info.ToString();
        }
    }
}
