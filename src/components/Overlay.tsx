import "@/styles/overlay.css";
import logo from "@/assets/logo.svg";

interface Props {
    text: string;
}

export const Overlay = ({ text }: Props) => {
    return (
        <div className="maintenance-container">
            <div className="maintenance-box">
                <img
                    src={logo}
                    alt="Bundler Logo"
                    className="maintenance-logo"
                />
                <div className="maintenance-title">We'll be back.</div>

                <div className="maintenance-text">{text}</div>

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
