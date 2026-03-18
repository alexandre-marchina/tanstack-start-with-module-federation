import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const sharedConfig = {
  react: { singleton: true },
  "react-dom": { singleton: true },
};

// MF per-environment hooks (resolveId, load, transform) only run on client.
// Global hooks (config, configResolved) still run to set up aliases & virtual files.
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
  // NOTE: hostInitInjectLocation: "entry" does NOT work when combined with
  // applyToEnvironment wrapper - the runtime init doesn't fire.
  // We must use our custom mfClientInit() plugin instead.
}).map((plugin) => ({
  ...plugin,
  applyToEnvironment: (env: { name: string }) => env.name === "client",
}));

// TanStack Start doesn't use index.html, so MF's transformIndexHtml hook
// never fires and the hostAutoInit module is never imported.
// NOTE: hostInitInjectLocation: "entry" doesn't work with applyToEnvironment wrapper.
// This plugin injects the auto-init import into the client entry so that
// the MF runtime initializes before any loadRemote() call runs.
function mfClientInit(): Plugin {
  return {
    name: "mf-client-init",
    applyToEnvironment: (env: { name: string }) => env.name === "client",
    transform(code, id) {
      if (id.includes("default-entry/client.tsx")) {
        return `import "__mf__virtual/host__H_A_I__hostAutoInit__H_A_I__.js";\n${code}`;
      }
    },
  };
}

// Patch MF's resolve.alias customResolvers so they skip SSR.
// MF redirects shared packages (react, react-dom) to loadShare virtual modules
// via resolve.alias with customResolver. In SSR, loadShare returns undefined → crash.
// By returning null from customResolver in SSR, the alias is skipped and
// packages resolve normally through Node/ssr.optimizeDeps.
function mfSsrBypass(): Plugin {
  const sharedKeys = Object.keys(sharedConfig);
  return {
    name: "mf-ssr-bypass",
    configResolved(config) {
      const aliases = config.resolve.alias;
      if (!Array.isArray(aliases)) return;
      for (const alias of aliases) {
        const pattern = alias.find;
        if (
          typeof alias.customResolver === "function" &&
          pattern instanceof RegExp &&
          sharedKeys.some((key) => pattern.test(key))
        ) {
          const orig = alias.customResolver;
          alias.customResolver = function (
            this: any,
            ...args: [string, string | undefined, any]
          ) {
            if (this.environment?.name === "ssr") return null;
            return orig.apply(this, args);
          };
        }
      }
    },
  };
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    exclude: ["remote_bff", "remote_simple"],
  },
  server: {
    port: 3000,
    origin: "http://localhost:3000",
  },
  plugins: [
    ...mfPlugins,
    mfSsrBypass(),
    mfClientInit(),
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
