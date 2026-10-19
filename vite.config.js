import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// Builds one self-contained index.html (JS + CSS inlined). Document page images stay in dist/docs/.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Shown in the app's footer, so whoever hosts it can tell which version they have
  define: { __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) },
});
