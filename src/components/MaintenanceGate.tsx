import React from "react";
import { Overlay } from "@/components/Overlay";

import { useMaintenance } from "@/hooks/useMaintenance";
import useBundlerAPIStatus from "@/hooks/useBundlerAPIStatus";
import { messages } from "@/messages";

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

export const MaintenanceGate = ({ children }: Props) => {
    const maintenance = useMaintenance();
    const { online, loading } = useBundlerAPIStatus();

    if (loading) {
        return <Loader hidden={!loading} />;
    }

    if (!maintenance && online) {
        return <>{children}</>;
    }

    const message = maintenance ? messages.maintenance : messages.apiDown;
    return <Overlay text={message} />;
};
