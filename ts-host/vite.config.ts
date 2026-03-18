/**
 * BROKEN VERSION - Minimal reproduction of @module-federation/vite SSR issues
 *
 * This config uses the MF plugin with `hostInitInjectLocation: "entry"` (the recommended
 * option for frameworks without index.html), but WITHOUT our SSR workarounds.
 *
 * Tested with @module-federation/vite@1.13.0 - issue persists.
 *
 * Actual error when running `npm run dev` and visiting http://localhost:3000:
 *
 *   TypeError: Cannot destructure property 'Activity' of 'exportModule' as it is undefined.
 *       at eval (.vite/deps_ssr/host__loadShare__react__loadShare__*.js)
 *
 * Root cause: MF's loadShare('react') returns undefined in SSR environment,
 * causing the virtual module to fail when destructuring React exports.
 *
 * Note: `hostInitInjectLocation: "entry"` does NOT fix this issue - it only addresses
 * MF runtime initialization for frameworks without index.html.
 *
 * Compare with: ts-host-with-CSR-remotes/vite.config.ts (working version)
 * Analysis: MF_SSR_ANALYSIS.md
 */
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const sharedConfig = {
  react: { singleton: true },
  "react-dom": { singleton: true },
};

const mfPlugins = federation({
  name: "host",
  filename: "remoteEntry.js",
  remotes: {
    remote_bff: {
      type: "module",
      name: "remote_bff",
      entry: "http://localhost:3001/remoteEntry.js",
      entryGlobalName: "remote_bff",
      shareScope: "default",
    },
    remote_simple: {
      type: "module",
      name: "remote_simple",
      entry: "http://localhost:3002/remoteEntry.js",
      entryGlobalName: "remote_simple",
      shareScope: "default",
    },
  },
  shared: sharedConfig,
  // Use "entry" injection since TanStack Start doesn't use index.html
  hostInitInjectLocation: "entry",
});

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    origin: "http://localhost:3000",
  },
  plugins: [
    ...mfPlugins,
    tanstackStart(),
    viteReact(),
  ],
  ssr: {
    noExternal: ["react", "react-dom", "@tanstack/react-router"],
    optimizeDeps: {
      noDiscovery: false,
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/server",
      ],
    },
  },
  build: {
    target: "chrome89",
  },
});
