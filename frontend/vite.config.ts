import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

import tailwindcss from "tailwindcss";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base_url = `${mode === "development" ? env.BASE_URL : ""}`;

  return {
    plugins: [react(), tsconfigPaths(), tailwindcss()],
    define: {
      "process.env.CONVERT_URL": JSON.stringify(`${base_url}/convert`),
      "process.env.COMPILE_URL": JSON.stringify(`${base_url}/compile`),
    },
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
  };
});
