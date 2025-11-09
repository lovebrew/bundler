import { Flask } from "@components/Flask";
import { Footer } from "@/components/Footer";
import { Toast } from "@components/Toast";
import { Overlay } from "@components/Overlay";

import "@/styles/index.css";

export default function App() {
  return (
    <>
      <Overlay />
      <Toast />
      <Flask />
      <Footer />
    </>
  );
}
