#!/usr/bin/env bash
# Start the .naka preview locally. Key comes from the secrets file; never echoed.
cd "$(dirname "$0")"
set -a; . /home/box/.secrets/shielded.env; set +a
export PORT="${PORT:-5188}" HOST="${HOST:-127.0.0.1}"
exec node server.mjs
