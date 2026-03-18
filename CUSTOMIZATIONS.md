# Customizations & Attention Points

> **Note:** This document describes the workarounds implemented in `ts-host-with-CSR-remotes/vite.config.ts` (the working version). The `ts-host` directory contains a minimal configuration **without** these workarounds to demonstrate the SSR issues. Compare both to understand what each workaround solves.

This document describes every workaround, customization, and known caveat required to integrate **TanStack Start** (SSR framework based on Vite) with **Module Federation** (`@module-federation/vite`).

---

## Table of Contents

1. [Vite Plugin Customizations (Host)](#1-vite-plugin-customizations-host)
   - [1.1 `applyToEnvironment` on MF plugins](#11-applytoEnvironment-on-mf-plugins)
   - [1.2 `mfSsrBypass` plugin](#12-mfssrbypass-plugin)
   - [1.3 `mfClientInit` plugin](#13-mfclientinit-plugin)
   - [1.4 SSR dependency configuration](#14-ssr-dependency-configuration)
   - [1.5 `optimizeDeps.exclude` for remote modules](#15-optimizedepsexclude-for-remote-modules)
2. [Attention Points & Known Caveats](#2-attention-points--known-caveats)

---

## 1. Vite Plugin Customizations (Host)

All workarounds live in `ts-host/vite.config.ts`. The plugin order matters:

```ts
plugins: [
  ...mfPlugins, // MF federation plugins (environment-scoped)
  mfSsrBypass(), // Patches MF aliases for SSR safety
  mfClientInit(), // Injects MF runtime init into client entry
  tanstackStart(), // TanStack Start framework plugin
  viteReact(), // React JSX transform
];
```

### 1.1 `applyToEnvironment` on MF plugins

After calling `federation()`, every returned plugin is wrapped with `applyToEnvironment` to restrict it to the `client` environment only

```ts
const mfPlugins = federation({
  /* ... */
}).map((plugin) => ({
  ...plugin,
  applyToEnvironment: (env: { name: string }) => env.name === "client",
}));
```

---

### 1.2 `mfSsrBypass` plugin

**Problem:** MF creates `resolve.alias` entries with a `customResolver` that redirects shared packages (`react`, `react-dom`) to `loadShare(...)` virtual modules. In SSR, `loadShare` returns `undefined`, crashing the application.

**Solution:** In the `configResolved` hook, identify aliases that match shared package keys and wrap their `customResolver` — if the current environment is `ssr`, return `null` (skip the alias), otherwise delegate to the original resolver.

```ts
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
          alias.customResolver = function (this: any, ...args) {
            if (this.environment?.name === "ssr") return null;
            return orig.apply(this, args);
          };
        }
      }
    },
  };
}
```

---

### 1.3 `mfClientInit` plugin

**Problem:** TanStack Start does not use an `index.html` file. It generates HTML via server-side streaming. MF relies on the `transformIndexHtml` hook to inject its runtime initialization (`hostAutoInit`), but this hook never fires without an `index.html`.

**Solution:** A custom plugin intercepts the client entry file (`default-entry/client.tsx`) during the `transform` hook and prepends an import to the MF auto-init virtual module.

```ts
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
```

**Why `default-entry/client.tsx`:** This is the entry point TanStack Start generates for the client bundle. The import path matches the virtual module name that MF would have injected via `transformIndexHtml`.

**Why not `hostInitInjectLocation: "entry"`?** The MF plugin offers a `hostInitInjectLocation: "entry"` option for frameworks without `index.html`. However, **this option does not work** when the MF plugins are wrapped with `applyToEnvironment` (section 1.1). The `transform` hook that performs the injection is filtered out by the environment restriction, so the MF runtime never initializes. Our custom `mfClientInit` plugin explicitly targets the client environment and performs the same injection reliably.

---

### 1.4 SSR dependency configuration

**Problem:** React and TanStack Router ship as CJS/ESM hybrid packages. Without explicit configuration, Vite's SSR bundler may resolve different copies of React (one CJS, one ESM), causing the "multiple copies of React" error during server-side rendering.

**Solution:**

```ts
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
}
```

- **`noExternal`**: Forces these packages to be bundled into the SSR output rather than left as external `require()` calls. This guarantees a single copy of React.
- **`optimizeDeps.include`**: Pre-bundles these packages for SSR, converting CJS exports to ESM and avoiding runtime resolution mismatches.
- **`noDiscovery: false`**: Re-enables automatic dependency discovery for SSR (Vite disables it by default), so transitive dependencies of the included packages are also handled.

---

### 1.5 `optimizeDeps.exclude` for remote modules

**Problem:** Vite's dependency optimizer scans source code for `import()` calls during dev startup and attempts to pre-bundle every discovered dependency into `node_modules/.vite/deps/`. When it encounters `import("remote_simple/ComponenteCSR")` or `import("remote_bff/Teste")`, it treats these as regular npm packages and creates optimized bundles for them — but since no such packages exist locally, the generated files are empty or broken. When the browser requests these modules, Vite serves the broken pre-bundled files instead of letting the MF plugin's `resolveId` hook intercept the import.

**Solution:** Explicitly exclude remote module names from the dependency optimizer:

```ts
optimizeDeps: {
  exclude: ["remote_bff", "remote_simple"],
},
```

**Why it works:** By excluding these bare specifiers, Vite skips pre-bundling them and lets the request reach the MF plugin's `resolveId` hook at runtime, which correctly redirects the import to `loadRemote()` and fetches the module from the remote's `remoteEntry.js`.

**Key detail:** Every remote name declared in the `remotes` config must be added to `optimizeDeps.exclude`. When adding a new remote, forgetting this step will cause a `TypeError: Failed to fetch dynamically imported module` in the browser — particularly confusing because it only affects other browsers/incognito windows (the developer's browser may have a cached working version from before the optimizer ran).

---

## 2. Attention Points & Known Caveats

### Deprecated `customResolver` in `@module-federation/vite`

The MF plugin creates `resolve.alias` entries using the `customResolver` property, which is **deprecated in Vite 8** and will be removed in **Vite 9**. The recommended replacement is a custom plugin with a `resolveId` hook and `enforce: 'pre'`.

Our `mfSsrBypass` plugin accesses `alias.customResolver` to wrap it — this works today but is coupled to MF's internal implementation. When `@module-federation/vite` updates to use `resolveId` instead, `mfSsrBypass` will need to be adapted accordingly.

### `optimizeDeps.exclude` must be kept in sync with remotes

Every remote name in the `remotes` federation config must also be listed in `optimizeDeps.exclude`. If a new remote is added to the federation config without updating `optimizeDeps.exclude`, Vite's dependency optimizer will attempt to pre-bundle the remote's imports, producing broken modules. The error manifests as `TypeError: Failed to fetch dynamically imported module` — but only in browsers that don't have a cached version, making it intermittent and hard to reproduce during development.

### Server Functions do not work in federated components — manual BFF required

TanStack Start provides **Server Functions** (`createServerFn`) as a type-safe RPC mechanism between client and server. However, Server Functions **do not work** when the component is loaded via Module Federation.
