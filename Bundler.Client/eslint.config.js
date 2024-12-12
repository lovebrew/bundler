import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
// import parser from "typescript-eslint/parser";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ["dist", "eslint.config.js", "tailwind.config.js"],
  }
);
