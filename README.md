# dot-agent-viewer

A macOS GUI desktop app for visualizing agent directory symlink relationships. Scans `~/.agents/commands` and `~/.agents/skills` for originals, then maps which agent directories (`~/.claude`, `~/.gemini`, etc.) expose each file as a symlink — all in one searchable, filterable window.

## Quickstart

```bash
npm install
npm run dev
```

This opens an Electron window in dev mode with HMR.

## Build

```bash
npm run build
```

Produces both:
- `dist/dot-agent-viewer-<version>-universal.dmg` — personal install (double-click)
- `dist/dot-agent-viewer-<version>-universal.zip` — **peer distribution primary** (Slack / AirDrop / GitHub release)

Expected bundle size: ~120 MB universal (Electron shell + app). The `< 30 MB` runtime constraint in the spec refers to npm `dependencies` (React, gray-matter, remark-gfm, fuse.js, etc.), not the Electron binary itself.

## Running on a peer machine (unsigned app)

After unzipping or mounting the DMG, clear the quarantine attribute before launching:

```bash
xattr -dr com.apple.quarantine /Applications/dot-agent-viewer.app
# or from the unzipped location:
xattr -dr com.apple.quarantine /path/to/dot-agent-viewer.app
```

Recommend distributing the `.zip` artifact over Slack or AirDrop; the `.dmg` is a convenience for personal install.

## Type-check

```bash
npm run typecheck
```

## Lint

```bash
npm run lint
```

## References

- Spec: [`.omc/specs/deep-interview-dot-agent-viewer.md`](.omc/specs/deep-interview-dot-agent-viewer.md)
- Plan: [`.omc/plans/dot-agent-viewer-plan.md`](.omc/plans/dot-agent-viewer-plan.md)

## v1 Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| A | Scaffold — Electron + TS + React blank window | ✓ Done |
| B | Scanner + IPC + unit tests | Pending |
| C | Renderer shell with mock data (two-pane layout) | Pending |
| D | Wire real data + fuzzy search/filter | Pending |
| E | Actions + dark mode + ⌘R refresh + staleness indicator | Pending |
| F | Production build, README, smoke script | Pending |

## Architecture

- **Main process (Node)** — FS scanning, frontmatter parse, symlink resolution, config IO, action handlers
- **Renderer (Chromium/React)** — UI, fuzzy search, filter chips, markdown render, Zustand state
- **Preload (contextBridge)** — typed IPC bridge exposed as `window.dotAgent`

Security: `nodeIntegration: false`, `contextIsolation: true`. No direct FS access from renderer.

## Future signing (post-v1)

`electron-builder.yml` keeps `identity: null`. When Apple Developer Program membership is available, replace with `CSC_LINK` / `CSC_KEY_PASSWORD` env vars and enable `notarize: true`.
