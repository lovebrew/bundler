import "@/styles/overlay.css";
import packageJson from "../../package.json";

export const Overlay = () => {
    if (!packageJson.maintenanceMode) return null;

    return (
        <div className="overlay">
            <div className="overlay-content">
                <h1>Hang Tight — We're Fixing Things</h1>
                <p>
                    The bundler is currently undergoing scheduled maintenance.</p>
                <p>
                    In the meantime, please use the{" "}
                    <a href="http://bundler.nawiasdev.eu" target="_blank" rel="noopener noreferrer">
                        alternate instance
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
