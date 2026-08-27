#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TUNNEL_CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"
TUNNEL_NAME="${CLOUDFLARED_TUNNEL:-satori-local}"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
  fi
  if [[ -n "${TUNNEL_PID:-}" ]]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"
npm run dev &
DEV_PID=$!
cloudflared tunnel --config "$TUNNEL_CONFIG" run "$TUNNEL_NAME" &
TUNNEL_PID=$!

while kill -0 "$DEV_PID" 2>/dev/null && kill -0 "$TUNNEL_PID" 2>/dev/null; do
  sleep 1
done

wait "$DEV_PID" "$TUNNEL_PID"
