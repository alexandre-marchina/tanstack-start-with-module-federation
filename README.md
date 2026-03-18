# TanStack Start + Module Federation - SSR Issue Reproduction

This repository demonstrates an SSR compatibility issue with `@module-federation/vite` when used with SSR frameworks like TanStack Start.

## Purpose

This is a **reproduction repository** for opening a discussion/issue with the `@module-federation/vite` maintainers. It shows:

1. The **broken behavior** (default MF plugin configuration)
2. The **working workarounds** (custom Vite plugins to bypass SSR issues)

## Repository Structure

| Directory                  | Description                                                         | Port |
| -------------------------- | ------------------------------------------------------------------- | ---- |
| `ts-host`                  | **Broken** - Minimal MF config without workarounds (crashes on SSR) | 3000 |
| `ts-host-with-CSR-remotes` | **Working** - MF config with SSR bypass workarounds                 | 3000 |
| `ts-remote-bff`            | Remote with BFF (exposes `Teste`, `Tradeoffs` components)           | 3001 |
| `ts-remote-simple`         | Simple remote (exposes `ComponenteCSR` component)                   | 3002 |

## Quick Reproduction

See [REPRODUCTION_STEPS.md](REPRODUCTION_STEPS.md) for detailed step-by-step instructions.

**TL;DR:**

```bash
# 1. Install all dependencies
cd ts-remote-bff && npm install && cd ..
cd ts-remote-simple && npm install && cd ..
cd ts-host && npm install && cd ..
cd ts-host-with-CSR-remotes && npm install && cd ..

# 2. Start remotes (in separate terminals)
cd ts-remote-bff && npm run dev      # Terminal 1
cd ts-remote-simple && npm run dev   # Terminal 2

# 3. Test broken version (Terminal 3)
cd ts-host && npm run dev
# Visit http://localhost:3000 → See SSR error

# 4. Test working version (stop ts-host first, then)
cd ts-host-with-CSR-remotes && npm run dev
# Visit http://localhost:3000 → Works correctly
```

## The Problem

When using `@module-federation/vite` with an SSR framework:

1. MF creates `resolve.alias` entries with `customResolver` for shared packages (`react`, `react-dom`)
2. These resolvers redirect imports to `loadShare(...)` virtual modules
3. In SSR environment, `loadShare()` returns `undefined` (MF runtime is browser-only)
4. **Result:** React becomes `undefined` → Application crashes

> **Note:** We tried using `hostInitInjectLocation: "entry"` (the recommended option for frameworks without `index.html`), but it does **not** fix this issue. That option only addresses MF runtime initialization—the SSR aliasing problem is separate.

## The Workarounds

The `ts-host-with-CSR-remotes/vite.config.ts` contains three custom plugins:

1. **`applyToEnvironment` wrapper** - Restricts MF hooks to client environment only
2. **`mfSsrBypass`** - Patches MF's alias `customResolver` to skip SSR
3. **`mfClientInit`** - Injects MF runtime init (TanStack Start doesn't use `index.html`)

## Documentation

- [REPRODUCTION_STEPS.md](REPRODUCTION_STEPS.md) - Step-by-step reproduction guide
- [CUSTOMIZATIONS.md](CUSTOMIZATIONS.md) - Detailed explanation of all workarounds

## Tech Stack

- [TanStack Start](https://tanstack.com/start) (React 19 + Vite 8)
- [Module Federation](https://module-federation.io/) (`@module-federation/vite@1.13.0`)
- TypeScript

## Prerequisites

- Node.js >= 20
- npm
