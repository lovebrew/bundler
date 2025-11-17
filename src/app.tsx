import { Flask } from "@components/Flask";
import { Footer } from "@/components/Footer";
import { Toast } from "@components/Toast";

import "@/styles/index.css";

export default function App() {
    return (
        <>
            <Toast />
            <Flask />
            <Footer />
        </>
    );
}
