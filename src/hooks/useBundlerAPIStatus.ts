import { API_URL } from "@/config";
import { useEffect, useState } from "react";

const healthCheckURL = `${API_URL}/health`;

export default function useBundlerAPIStatus() {
    const [online, setOnline] = useState(true);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(healthCheckURL);
                if (!res.ok) {
                    throw new Error("HTTP status code: " + res.status);
                } else if (!cancelled) setOnline(true);
            } catch (error) {
                console.error(error);
                if (!cancelled) setOnline(false);
            }
            setLoading(false);
        };
        fetchData();
        return () => {
            cancelled = true;
        };
    }, []);
    return { online, loading };
}
