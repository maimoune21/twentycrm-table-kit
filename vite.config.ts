import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import apiStubPlugin from "./api-stub-plugin";

const SRC = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [
    apiStubPlugin({
      upstreamApiDir: `${SRC}/api`,
      realStubs: {},
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: "@api", replacement: `${SRC}/api` },
      { find: "@", replacement: SRC },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: false,
    open: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "jotai", "sonner"],
  },
});
