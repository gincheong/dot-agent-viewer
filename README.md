# dot-agent-viewer

dot-agent-viewer is a macOS desktop app that makes the symlink relationships between your AI agent directories visible and searchable. It is built around the pattern where a shared hub (`~/.agents`) holds canonical command and skill files, and each agent directory (`~/.claude`, `~/.gemini`, etc.) exposes those files as symlinks — but also carries its own agent-local files that live only inside that root. dot-agent-viewer scans every configured agent root, classifies each entry into one of three provenance buckets (`agents-hub`, `agent-local`, `external-link`), and surfaces all of them in a two-pane inspector with full frontmatter metadata, markdown preview, symlink mapping, fuzzy search, and key-based filter chips. Nothing is ever silently omitted: broken symlinks, external-link targets, and plain non-symlinked files all get their own clearly-labelled row.

---

## Status — v0.1.0 (Phase F complete)

| Feature | Status |
|---|---|
| Three-bucket scanner (`agents-hub` / `agent-local` / `external-link`) | Done |
| Fuzzy search (name + description) | Done |
| Frontmatter chips (`model:opus`, `allowed-tools:*`, etc.) | Done |
| Copy-path / copy-body / open-in-editor actions | Done |
| Dark mode (follows macOS Appearance automatically) | Done |
| `Cmd+R` refresh | Done |
| Staleness pill ("Last scanned: Nm ago" + stale indicator at > 60 s) | Done |
| Configurable roots via `~/.config/dot-agent-viewer/config.json` | Done |

---

## Install / Run (dev)

```bash
npm install
npm run dev
```

This opens an Electron window in dev mode with hot-module reloading. The app scans your real `~/.agents`, `~/.claude`, and `~/.gemini` directories on launch.

---

## Build (.app)

```bash
npm run build
```

Produces a universal macOS bundle in `dist/`:

```
dist/
  mac/
    dot-agent-viewer.app          # directly launchable .app
  dot-agent-viewer-0.1.0-universal.dmg   # personal-use installer
  dot-agent-viewer-0.1.0-universal-mac.zip  # peer-distribution primary
```

**Bundle size:** ~120 MB (Electron universal binary). This is expected — the `< 30 MB` runtime constraint in the spec applies to npm `dependencies` (React, gray-matter, fuse.js, etc.), not the Electron shell itself.

You can also target macOS explicitly:

```bash
npm run build:mac
```

---

## Distribute to peers

The `.zip` artifact is the recommended path for sharing over Slack or AirDrop. The `.dmg` is a personal-use convenience (double-click to mount and drag to Applications), but DMG files are awkward to transfer over chat.

**Peer install steps:**

1. Download the `.zip` artifact
2. Unzip — you get `dot-agent-viewer.app`
3. Drag `dot-agent-viewer.app` to `/Applications`
4. Clear the macOS quarantine attribute (required for unsigned apps):
   ```bash
   xattr -dr com.apple.quarantine /Applications/dot-agent-viewer.app
   ```
5. Launch `dot-agent-viewer` from Applications

Without step 4, macOS Gatekeeper will refuse to open the app. This is expected for unsigned apps distributed outside the App Store.

---

## Configuration

The app reads `~/.config/dot-agent-viewer/config.json` if it exists. All fields are optional; the defaults cover `~/.claude` and `~/.gemini` out of the box.

**Schema:**

```json
{
  "originalsRoot": "~/.agents",
  "roots": [
    {
      "name": "Codex",
      "path": "~/.codex",
      "scopes": [{ "glob": "**/*.md", "kind": "any" }]
    }
  ],
  "mergeStrategy": "append"
}
```

| Field | Default | Description |
|---|---|---|
| `originalsRoot` | `~/.agents` | Hub directory containing canonical `commands/` and `skills/` originals. Set to `null` to disable hub-grouping entirely. |
| `roots` | `[Claude, Gemini]` | Agent roots to scan. Each entry needs `name`, `path`, and `scopes`. |
| `roots[].scopes` | per-root defaults | Array of `{ glob, kind }` pairs. `kind` is `"command"`, `"skill"`, or `"any"`. |
| `mergeStrategy` | `"append"` | `"append"` adds your roots to the defaults; `"replace"` substitutes them entirely. |

**Working example** (add Codex alongside Claude and Gemini):

```json
{
  "originalsRoot": "~/.agents",
  "roots": [
    {
      "name": "Codex",
      "path": "~/.codex",
      "scopes": [
        { "glob": "**/*.md", "kind": "any" }
      ]
    }
  ],
  "mergeStrategy": "append"
}
```

Save the file, then press `Cmd+R` in the app to rescan.

---

## Tests

```bash
# Type-check both main and renderer TS configs
npm run typecheck

# Unit tests (Vitest, Node — 43 specs)
npm run test:unit

# End-to-end tests (Playwright + Electron — 8 specs)
npm run test:e2e

# Performance bench (Vitest bench — scanner NFR < 1s at 1000 originals)
npm run bench
```

The e2e suite boots a real Electron process against temp-dir fixtures (no mocking of the Electron API layer). All tests run without network access.

---

## Troubleshooting

### App won't launch

**Symptom:** macOS shows "dot-agent-viewer cannot be opened because the developer cannot be verified."

**Fix:** Clear the quarantine attribute:

```bash
xattr -dr com.apple.quarantine /Applications/dot-agent-viewer.app
```

If you launched from a path other than `/Applications`, replace the path accordingly.

---

### Source missing from sidebar

**Symptom:** You expect a file to appear in the list but it does not.

**Check:**
- Look at the **provenance buckets** in the sidebar. Files that are not symlinks into `~/.agents` appear under "agent-local files" or "external links" — not under the main `commands` / `skills` groups.
- If the file's agent root is not in your configured roots (default: `~/.claude` + `~/.gemini`), it will not be scanned. Add it via `~/.config/dot-agent-viewer/config.json` and press `Cmd+R`.
- If the file matches your root's path but not its configured scope globs, it is intentionally excluded. Widen the scope glob (e.g. `**/*.md`) in config.

---

### Stale data / changes not reflected

**Symptom:** You edited or added a file, but the app still shows the old state.

**Fix:** Press `Cmd+R` (or click the Refresh button). The app does not watch the filesystem automatically in v0.1.0. The staleness indicator ("Last scanned: Nm ago") turns orange when the scan is more than 60 seconds old.

---

### Search returns no results

**Symptom:** Typing in the search bar empties the list entirely.

**Check:**
- Filter chips (below the search bar) apply as an AND over fuzzy results. If a chip is active, only items matching both the search query and the chip value are shown. Click an active chip to deactivate it.
- The fuzzy threshold is 0.35 (Fuse.js). Very short or very ambiguous queries may return fewer results than expected — try a longer substring.

---

## Architecture

dot-agent-viewer follows the Electron security model strictly: `nodeIntegration: false`, `contextIsolation: true`. The main process (Node) owns all filesystem access, frontmatter parsing, symlink resolution, config IO, and action dispatch. The renderer (Chromium + React + Zustand) owns the UI, fuzzy search index, filter state, and markdown rendering. A typed `contextBridge` under `window.dotAgent` is the only IPC surface — all channels are `invoke`/`handle` (request-response) with typed payloads defined in `src/shared/ipc.ts`.

The scanner is **agent-root-driven**: it enumerates every entry under every configured agent root via `fs.lstat`, classifies each entry into one of three provenance buckets, and reconciles against the optional hub originals index. This direction (agent-root → hub, not hub → agent-root) ensures that non-symlink agent-local files (like `~/.gemini/GEMINI.md`) and external-link symlinks are never silently omitted. Every entry produces a `SourceItem` with an explicit `provenance` field. For full detail, see `.omc/specs/deep-interview-dot-agent-viewer.md` and `.omc/plans/dot-agent-viewer-plan.md`.

---

## Non-goals (v0.1.0)

- Mac App Store distribution
- Windows / Linux builds
- Cloud sync or remote agent directories
- Automated CI signing + notarization
- Multi-user / multi-profile support
- Inline markdown body editing inside the app
- Symlink create/delete or any FS writes to agent dirs
- File watcher with auto-refresh (deferred to v0.2)

---

## License

TBD
