import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
    origin: "http://localhost:3001",
  },
  plugins: [
    federation({
      name: "remote_bff",
      filename: "remoteEntry.js",
      exposes: {
        "./Test": "./src/exposes/Test.tsx",
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
