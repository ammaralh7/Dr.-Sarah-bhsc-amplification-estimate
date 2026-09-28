import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// Builds one self-contained index.html (JS + CSS inlined). Document page images stay in dist/docs/.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
