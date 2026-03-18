# Reproduction Steps

This guide walks through reproducing the `@module-federation/vite` SSR issue with TanStack Start.

## Prerequisites

- Node.js >= 20
- npm
- 4 terminal windows (or tabs)

## Setup

### 1. Install Dependencies

```bash
# From repository root
cd ts-remote-bff && npm install && cd ..
cd ts-remote-simple && npm install && cd ..
cd ts-host && npm install && cd ..
cd ts-host-with-CSR-remotes && npm install && cd ..
```

### 2. Start Remote Applications

**Terminal 1 - Remote BFF (port 3001):**

```bash
cd ts-remote-bff
npm run dev
```

Wait for: `VITE vX.X.X ready in XXX ms`

**Terminal 2 - Remote Simple (port 3002):**

```bash
cd ts-remote-simple
npm run dev
```

Wait for: `VITE vX.X.X ready in XXX ms`

---

## Reproduce the Issue

### 3. Start Broken Host (Terminal 3)

```bash
cd ts-host
npm run dev
```

**Expected behavior:** The server starts but crashes on the first SSR request.

**Actual error (in terminal):**

```
TypeError: Cannot destructure property 'Activity' of 'exportModule' as it is undefined.
    at eval (.vite/deps_ssr/host__loadShare__react__loadShare__*.js:1183:14)
```

The error occurs because:
1. MF's `resolve.alias` redirects `react` → `loadShare('react')` virtual module
2. In SSR, `loadShare()` returns `undefined` (MF runtime is browser-only)
3. The virtual module tries to destructure React exports from `undefined` → crash

> **Note:** The broken version uses `hostInitInjectLocation: "entry"` (the recommended option for frameworks without `index.html`). This does **not** fix the SSR issue—it only addresses MF runtime initialization, which is a separate concern.

**What you'll see:** The Vite server starts (`VITE v8.0.0 ready`), but crashes immediately when you visit http://localhost:3000 or when any SSR request triggers React resolution.

---

## Verify the Fix

### 4. Stop the Broken Host

Press `Ctrl+C` in Terminal 3 to stop `ts-host`.

### 5. Start Working Host

```bash
cd ts-host-with-CSR-remotes
npm run dev
```

**Expected behavior:** Server starts successfully. Visit http://localhost:3000.

**What you'll see:**
- Page renders (SSR works)
- Remote components show loading states initially
- After hydration, remote components load and render correctly

---

## Understanding the Difference

### Compare the Configurations

**Broken (`ts-host/vite.config.ts`):**
- Uses MF plugin directly without modifications
- No SSR bypass for shared package aliases
- No MF runtime initialization injection

**Working (`ts-host-with-CSR-remotes/vite.config.ts`):**
- Wraps MF plugins with `applyToEnvironment` to restrict to client
- `mfSsrBypass` plugin patches alias `customResolver` to skip SSR
- `mfClientInit` plugin injects MF runtime init into client entry
- `optimizeDeps.exclude` prevents Vite from pre-bundling remote modules

### Key Code Differences

```diff
# ts-host/vite.config.ts (broken)
- const mfPlugins = federation({ ... });

# ts-host-with-CSR-remotes/vite.config.ts (working)
+ const mfPlugins = federation({ ... }).map((plugin) => ({
+   ...plugin,
+   applyToEnvironment: (env) => env.name === "client",
+ }));
+
+ function mfSsrBypass(): Plugin { ... }  // Patches aliases for SSR
+ function mfClientInit(): Plugin { ... } // Injects runtime init
+
+ optimizeDeps: {
+   exclude: ["remote_bff", "remote_simple"],
+ },
```

---

## What Should Be Fixed Upstream

See [MF_SSR_ANALYSIS.md](MF_SSR_ANALYSIS.md) for detailed analysis.

**Summary:** The `@module-federation/vite` plugin's `customResolver` functions should check `this.environment?.name === 'ssr'` and return `null` to skip MF aliasing in SSR, allowing native Node module resolution.

---

## Troubleshooting

### "Port already in use"

```bash
# Find and kill process on port
lsof -ti:3000 | xargs kill -9  # or 3001, 3002
```

### "Module not found" errors

Make sure all remotes are running before starting the host:
- ts-remote-bff on port 3001
- ts-remote-simple on port 3002

### Clean restart

```bash
# Remove node_modules and reinstall
rm -rf ts-host/node_modules ts-host-with-CSR-remotes/node_modules
rm -rf ts-remote-bff/node_modules ts-remote-simple/node_modules
# Then follow Setup steps again
```
