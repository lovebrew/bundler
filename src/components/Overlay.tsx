import "@/styles/overlay.css";
import "@/styles/loader.css"
import useBundlerAPIStatus from "@/hooks/useBundlerAPIStatus";
import { useEffect, useState } from "react";

type LoaderProps = {
    hidden?: boolean
}
const Loader = ({hidden}:LoaderProps) => (
    <div className="loader-containter">
        <span className={`loader ${hidden ? '':'show'}`}></span>
    </div>
)

export const Overlay = () => {
    const {online, loading} = useBundlerAPIStatus();
    
    const [maintenance, setMaintenance] = useState(false);
    
    useEffect(()=>{    
        const fetchData = async () => {
        try {
            const res = await fetch(`/config.json?cachebust=${Date.now()}`);
            if (!res.ok) {
                throw new Error("HTTP status code: " + res.status);
            }
            const cfg = await res.json();
            setMaintenance(cfg.maintenance)
        } catch (error) {
            console.error(error);
            setMaintenance(false)
        }
        };
        fetchData();
    })

    return (
        <>
        {(!online || maintenance) && <div className="overlay">
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
        </div>}
        <Loader hidden={!loading} />
        </>
    );
};
