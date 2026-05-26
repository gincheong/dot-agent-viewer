#!/usr/bin/env bash
# scripts/smoke.sh — packaged-app smoke test for dot-agent-viewer
#
# Usage:
#   bash scripts/smoke.sh        # via npm run smoke
#
# Steps:
#   1. npm run build — produces .app, .dmg, .zip in dist/
#   2. Assert dist/mac/dot-agent-viewer.app exists
#   3. Assert Contents/MacOS binary is a universal (fat) binary
#   4. Launch .app with --smoke-exit; assert it exits 0 within 8s
#
# Returns 0 on full success, non-zero otherwise (reason printed to stderr).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# electron-builder uses `mac-universal/` for universal arch, `mac/` for single arch.
# Auto-detect whichever exists; prefer universal.
if [[ -d "$REPO_ROOT/dist/mac-universal/dot-agent-viewer.app" ]]; then
  APP_PATH="$REPO_ROOT/dist/mac-universal/dot-agent-viewer.app"
elif [[ -d "$REPO_ROOT/dist/mac/dot-agent-viewer.app" ]]; then
  APP_PATH="$REPO_ROOT/dist/mac/dot-agent-viewer.app"
elif [[ -d "$REPO_ROOT/dist/mac-arm64/dot-agent-viewer.app" ]]; then
  APP_PATH="$REPO_ROOT/dist/mac-arm64/dot-agent-viewer.app"
else
  APP_PATH="$REPO_ROOT/dist/mac-universal/dot-agent-viewer.app"  # fallback used in error message
fi
BINARY="$APP_PATH/Contents/MacOS/dot-agent-viewer"
SMOKE_TIMEOUT=8

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1" >&2; exit 1; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# ── Step 1: Build ────────────────────────────────────────────────────────────
info "Running npm run build (this may take several minutes on first run)..."
cd "$REPO_ROOT"
if ! npm run build; then
  fail "npm run build failed. See output above."
fi
pass "Build completed."

# ── Step 2: Assert .app exists ───────────────────────────────────────────────
if [[ ! -d "$APP_PATH" ]]; then
  fail ".app bundle not found at: $APP_PATH"
fi
pass ".app bundle exists: $APP_PATH"

# ── Step 3: Universal binary check ───────────────────────────────────────────
if [[ ! -f "$BINARY" ]]; then
  fail "Main binary not found at: $BINARY"
fi

FILE_OUTPUT="$(file "$BINARY")"
info "file output: $FILE_OUTPUT"

if echo "$FILE_OUTPUT" | grep -q "Mach-O universal binary"; then
  pass "Universal binary confirmed (arm64 + x86_64)."
else
  fail "Binary is NOT a universal binary. file output: $FILE_OUTPUT"
fi

# ── Step 4: Launch + smoke-exit ──────────────────────────────────────────────
info "Launching .app with --smoke-exit (timeout: ${SMOKE_TIMEOUT}s)..."

"$BINARY" --smoke-exit &
SMOKE_PID=$!

# Poll for process exit within timeout
ELAPSED=0
INTERVAL=1
EXITED=false
while [[ $ELAPSED -lt $SMOKE_TIMEOUT ]]; do
  if ! kill -0 "$SMOKE_PID" 2>/dev/null; then
    EXITED=true
    break
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [[ "$EXITED" == "false" ]]; then
  kill "$SMOKE_PID" 2>/dev/null || true
  fail "App did not exit within ${SMOKE_TIMEOUT}s. Killed PID $SMOKE_PID."
fi

# Capture exit code
wait "$SMOKE_PID" 2>/dev/null
EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
  fail "App exited with non-zero code: $EXIT_CODE"
fi
pass "App launched and exited cleanly (exit 0) within ${ELAPSED}s."

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}All smoke checks passed.${NC}"
echo ""
echo "Artifacts:"
ls -lh "$REPO_ROOT/dist/"*.dmg "$REPO_ROOT/dist/"*.zip 2>/dev/null || true
echo ""
echo "To distribute to peers (unsigned app — quarantine workaround required):"
echo "  1. Share the .zip artifact (not .dmg) over Slack / AirDrop"
echo "  2. Peer unzips, drags .app to /Applications"
echo "  3. Peer runs:"
echo "       xattr -dr com.apple.quarantine /Applications/dot-agent-viewer.app"
echo "  4. Launch"
