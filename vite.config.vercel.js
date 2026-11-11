import { readFileSync } from "node:fs";
import base44 from "@base44/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Vercel build: the same app, built with Nitro instead of the Cloudflare plugin.
// The app's own vite.config.js stays untouched for the Base44 preview/publish.
const NOT_PREBUNDLED = new Set(["react", "react-dom", "@base44/vite-plugin", "@tanstack/react-start", "@tanstack/react-router", "@tanstack/react-router-ssr-query", "tailwindcss-animate"]);
const { dependencies } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const PREBUNDLE = Object.keys(dependencies).filter((name) => !NOT_PREBUNDLED.has(name) && name !== "nitro");

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": new URL("./vercel/cloudflare-workers-shim.js", import.meta.url).pathname,
    },
  },
  optimizeDeps: { include: PREBUNDLE },
  environments: {
    ssr: {
      optimizeDeps: { include: PREBUNDLE },
    },
  },
  plugins: [
    base44({
      hmrNotifier: false,
      navigationNotifier: false,
      analyticsTracker: true,
      visualEditAgent: false,
    }),
    tanstackStart({ srcDirectory: "src" }),
    nitro(),
    react(),
  ],
});