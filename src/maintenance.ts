import { useEffect, useState } from "react";
import useBundlerAPIStatus from "./hooks/useBundlerAPIStatus";

export function checkMaintenance(): boolean {
  const { online } = useBundlerAPIStatus();
  const [maintenance, setMaintenance] = useState<boolean>(false);

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

  return !online || maintenance;
}
