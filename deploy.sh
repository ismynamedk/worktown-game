#!/bin/bash
# Work Town deploy. Her Cloudflare account ONLY. Parks whatever wrangler login is
# active, swaps hers in, refuses if the identity is wrong, restores on the way out.
set -euo pipefail
WANT=5fdc2013f43780d59aebd0bf72d798bd
CFG="$HOME/.wrangler/config"
PARK="$CFG/default.toml.parked-by-worktown"
cp "$CFG/default.toml" "$PARK" 2>/dev/null || true
trap 'cp "$PARK" "$CFG/default.toml" 2>/dev/null || true' EXIT
cp "$CFG/default.toml.smile-client" "$CFG/default.toml"
unset CLOUDFLARE_API_TOKEN
GOT=$(npx wrangler whoami 2>&1 | grep -oE '[0-9a-f]{32}' | sort -u)
[ "$GOT" = "$WANT" ] || { echo "REFUSING: wrangler sees '$GOT', expected $WANT"; exit 1; }
BASE=/ npm run build
CLOUDFLARE_ACCOUNT_ID=$WANT npx wrangler deploy
