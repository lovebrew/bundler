import { Flask } from "@components/Flask";
import { Footer } from "@/components/Footer";
import { Toast } from "@components/Toast";

import "@/styles/index.css";

import { Overlay } from "@components/Overlay";
import { checkMaintenance } from "./maintenance";

export default function App() {
  const maintenance = checkMaintenance();

  return (
    <>
      {maintenance ? <Overlay /> : null}
      <Toast />
      <Flask />
      <Footer />
    </>
  );
}
