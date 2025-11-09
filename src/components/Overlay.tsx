import "@/styles/overlay.css";
import { useEffect, useState } from "react";

export const Overlay = () => {
    const [maintenance, setMaintenance] = useState<boolean | null>(null);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await fetch("./config.json", { cache: "no-cache" });
                if (!res.ok) throw new Error("Failed to fetch config");
                const cfg = await res.json();
                setMaintenance(!!cfg.maintenance);
            } catch (err) {
                console.error("Error loading config:", err);
                setMaintenance(false); // default to false on error
            }
        }

        fetchConfig();
    }, []);

    // While loading, don't show anything
    if (maintenance === null || !maintenance) return null;

    return (
        <div className="overlay">
            <div className="overlay-content">
                <h1>Hang Tight — We're Fixing Things</h1>
                <p>
                    The bundler is currently undergoing scheduled maintenance.
                </p>
                <p>
                    In the meantime, please use the{" "}
                    <a
                        href="http://bundler.nawiasdev.eu"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        alternate instance
                    </a>
                    .
                </p>
            </div>
        </div>
    );
};
