import { useEffect, useState } from "react";

export function useMaintenance() {
    const [maintenance, setMaintenance] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/config.json?cachebust=${Date.now()}`);
                if (!res.ok) {
                    throw new Error("HTTP status code: " + res.status);
                }
                const cfg = await res.json();
                setMaintenance(cfg.maintenance);
            } catch (error) {
                console.error(error);
                setMaintenance(false);
            }
        };
        fetchData();
    });

    return maintenance;
}
