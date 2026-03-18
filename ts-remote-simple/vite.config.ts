import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3002,
    origin: "http://localhost:3002",
  },
  plugins: [
    federation({
      name: "remote_simple",
      filename: "remoteEntry.js",
      exposes: {
        "./ComponenteCSR": "./src/exposes/ComponenteCSR.tsx",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
    tanstackStart(),
    viteReact(),
  ],
  build: {
    target: "chrome89",
  },
});
