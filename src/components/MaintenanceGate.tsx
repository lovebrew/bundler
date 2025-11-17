import React from "react";
import { Overlay } from "@/components/Overlay";

import { useMaintenance } from "@/hooks/useMaintenance";
import useBundlerAPIStatus from "@/hooks/useBundlerAPIStatus";

interface Props {
    children: React.ReactNode;
}

type LoaderProps = {
    hidden?: boolean;
};
const Loader = ({ hidden }: LoaderProps) => (
    <div className="loader-containter">
        <i
            className={`fa-solid fa-spinner fa-spin fa-3x loader ${hidden ? "" : "show"}`}
        ></i>
    </div>
);

const maintenanceText =
    "This instance is temporarily offline for scheduled maintenance.";
const apiStatusText =
    "The bundler API is currently unavailable. Please try again later.";

export const MaintenanceGate = ({ children }: Props) => {
    const maintenance = useMaintenance();
    const { online, loading } = useBundlerAPIStatus();

    if (loading) {
        return <Loader hidden={!loading} />;
    }

    if (!maintenance && online) {
        return <>{children}</>;
    }
    return <Overlay text={maintenance ? maintenanceText : apiStatusText} />;
};
