import supportedBrowsers from "../../supportedBrowsers";

function Banner() {
  if (supportedBrowsers.test(navigator.userAgent)) return null;

  return (
    <div className="absolute animate-fadeIn z-30 backdrop-brightness-50 w-full h-full flex mx-auto justify-center content-center items-center">
        <div className="flex justify-center p-5 rounded-lg shadow bg-white drop-shadow-flask">
            <div>
                <svg className="w-6 h-6 fill-current text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/>
                </svg>
            </div>
            <div className="ml-3">
            <h2 className="font-semibold text-gray-800">Incompatible Browser Detected</h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Your browser version may not be compatible with the bundler. Please update.
            </p>
          </div>
        </div>
    </div>
  );
}

export default Banner;
