#!/usr/bin/env bash
# Opt-in: verifies the same stdio MCP server works through the real Claude Code CLI (`claude -p`).
#
# Requires: `claude` on PATH and a normal Claude Code login (subscription / OAuth / keychain)—same
# as interactive `claude`. We do NOT use `--bare` here; `--bare` is only for API-key-only CI and
# then requires ANTHROPIC_API_KEY per headless docs.
#
#   CLAUDE_CODE_MCP_SMOKE=1 npm run test:claude-mcp
#
# Skips with exit 0 if CLAUDE_CODE_MCP_SMOKE is unset (CI-friendly).

set -euo pipefail

if [[ "${CLAUDE_CODE_MCP_SMOKE:-}" != "1" ]]; then
  echo "SKIP: set CLAUDE_CODE_MCP_SMOKE=1 to run the Claude CLI MCP smoke test."
  exit 0
fi

if ! command -v claude &>/dev/null; then
  echo "SKIP: claude CLI not found on PATH."
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build --silent

MCP_JSON="$(node -e "
const p = require('path');
const root = process.argv[1];
const cli = p.join(root, 'dist', 'cli.js');
console.log(JSON.stringify({
  mcpServers: {
    apg: {
      command: 'node',
      args: [cli],
      env: { OLLAMA_SKIP_PULL: '1' }
    }
  }
}));
" "$ROOT")"

# Tool id in Claude Code: mcp__<serverName>__<toolName>
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

set +e
claude -p "You must invoke the MCP tool apg_meta from server apg exactly once. From the tool JSON result, reply with a single line containing only the integer patternCount and nothing else." \
  --mcp-config "$MCP_JSON" \
  --strict-mcp-config \
  --allowedTools "mcp__apg__apg_meta" \
  --output-format text \
  </dev/null \
  >"$TMP" 2>&1
STATUS=$?
set -e

if [[ "$STATUS" -ne 0 ]]; then
  cat "$TMP"
  exit "$STATUS"
fi

OUT="$(cat "$TMP")"
echo "$OUT"

if ! grep -q '30' <<<"$OUT"; then
  echo "Smoke test: expected pattern count 30 in output, got:" >&2
  echo "$OUT" >&2
  exit 1
fi

echo "OK: Claude CLI invoked mcp__apg__apg_meta successfully."
