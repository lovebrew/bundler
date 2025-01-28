import { useEffect, useState } from "react";
import styles from "./index.module.css"; // Import the styles from CSS Module

import supportedBrowsers from "@/src/supportedBrowsers";

const Banner = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    setIsSupported(supportedBrowsers.test(navigator.userAgent));
  }, []);

  return (
    <div>
      {!isSupported && (
        <div className={styles.bannerBackground}>
          <div
            className={`${styles.bannerOverlay} ${styles.bannerOverlayOpen}`}
          >
            <p>
              Your browser is not supported. Please update to a modern browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banner;
