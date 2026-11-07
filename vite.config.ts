import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync } from "fs";
import { componentTagger } from "lovable-tagger";

/** GitHub Pages has no SPA rewrite, so a direct visit to /lab must still load the app. */
function githubPagesSpaFallback(): Plugin {
  return {
    name: "github-pages-spa-fallback",
    apply: "build",
    closeBundle() {
      if (process.env.GITHUB_PAGES !== "true") return;
      const outDir = path.resolve(__dirname, "dist");
      copyFileSync(path.join(outDir, "index.html"), path.join(outDir, "404.html"));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_PAGES === "true" ? "/Campus-Ride-Smart-E-Rickshaw-Pooling-System/" : "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), githubPagesSpaFallback(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
