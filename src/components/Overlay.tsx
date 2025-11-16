import "@/styles/overlay.css";
import logo from "@/assets/logo.svg";

export const Overlay = () => {
  return (
    <div className="maintenance-container">
      <div className="maintenance-box">
        <img src={logo} alt="Bundler Logo" className="maintenance-logo" />
        <div className="maintenance-title">Maintenance in Progress</div>

        <div className="maintenance-text">
          This instance is temporarily offline for scheduled maintenance.
        </div>

        <a
          href="https://bundler.nawiasdev.eu"
          className="maintenance-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          Go to Alternate Instance
        </a>
      </div>
    </div>
  );
};
