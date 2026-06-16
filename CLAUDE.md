# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev mode with HMR (opens Electron window)
npm run build        # production build → dist/ (universal macOS .app + .dmg + .zip)
npm run build:dev    # compile only (no electron-builder packaging)
npm run typecheck    # type-check both main and renderer tsconfigs
npm run lint         # ESLint over src/
npm run test:unit    # Vitest unit tests (Node, no Electron)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright e2e tests (spins a real Electron process)
npm run bench        # Vitest bench — scanner must complete < 1 s at 1000 originals
npm run smoke        # bash scripts/smoke.sh sanity check
```

Run a single unit test file: `npx vitest run tests/unit/scanner/sources.test.ts`

## Architecture

This is a macOS-only Electron app (electron-vite scaffold) that visualises the symlink relationships between AI agent config directories.

### Process split

```
src/main/      — Node process: filesystem access, IPC handlers, scanner, actions
src/preload/   — contextBridge: exposes typed window.dotAgent API to renderer
src/renderer/  — Chromium: React 18 + Zustand, fuzzy search, markdown render
src/shared/    — types.ts (SourceItem, ScanResult, etc.) + ipc.ts (channel constants + payload types)
```

`nodeIntegration: false`, `contextIsolation: true`. All Node/FS work must live in main. The renderer may only call `window.dotAgent.*` (preload bridge).

### IPC surface (`src/shared/ipc.ts`)

- **Invoke/handle** (request-response): `IPC.*` constants — `scanner:rescan`, `scanner:status`, `config:get-roots`, `action:open-editor`, `action:copy-path`, `action:copy-body`, `system:appearance`
- **One-way events** (main → renderer via `webContents.send`): `EVENTS.*` — `app:rescan-request`, `system:appearance-changed`

All channel names and payload types live in `src/shared/ipc.ts`. Never hardcode channel strings elsewhere.

### Scanner (`src/main/scanner/`)

The scan is **agent-root-driven** (not hub-driven):

1. `buildOriginalsIndex(originalsRoot)` — enumerates `~/.agents/commands/*.md` and `~/.agents/skills/*/` and builds a `Map<absPath, SourceItem>` with `provenance: 'agents-hub'`.
2. `scanAgentRoots(roots, ...)` — for each configured agent root, `lstat` every entry; classify into one of three provenance buckets:
   - `agents-hub` — symlink whose resolved target is inside `originalsRoot`; attach `SymlinkRef` to the hub item.
   - `agent-local` — non-symlink file/dir inside an agent root (e.g. `~/.gemini/GEMINI.md`).
   - `external-link` — symlink whose target resolves *outside* `originalsRoot`.
3. `runScan()` merges and sorts: hub items first, then agent-local, then external-link; within bucket: commands before skills, then alphabetical.

This direction ensures broken symlinks, agent-local files, and external links are never silently omitted.

### Renderer state (`src/renderer/store/useAppStore.ts`)

Single Zustand store. `rescan()` calls `window.dotAgent.rescan()` (IPC) and replaces the entire `sources` / `agents` / `scannedAt` state. In e2e tests, `window.__testScanResult` is injected via Playwright `addInitScript` to bypass IPC — the store checks for this first.

### Configuration

`~/.config/dot-agent-viewer/config.json` — optional, all fields optional. Parsed in `src/main/scanner/config.ts`. Fields: `originalsRoot` (string | null), `roots` (array of `{name, path, scopes}`), `mergeStrategy` (`"append"` | `"replace"`). Defaults: `~/.agents` hub, Claude + Gemini roots. `mergeStrategy: "append"` adds user roots to defaults; `"replace"` substitutes them.

### Testing conventions

- **Unit tests** (`tests/unit/`): Vitest + jsdom + `@testing-library/react`. No Electron dependency. Scanner tests use `tests/fixtures/agents-home/` as a real temp-dir fixture tree.
- **E2e tests** (`tests/e2e/`): Playwright launches `out/main/index.js` as a real Electron process. Fixtures inject `window.__testScanResult` to bypass IPC; spy helpers live in `preload-spies.ts`. E2e requires a prior `npm run build:dev` (or `npm run build`).
- `__mockSourcesForTests` in `useAppStore.ts` is exported for component unit tests that need deterministic seed data.
