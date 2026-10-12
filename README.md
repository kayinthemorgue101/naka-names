# .naka registry (local preview)

The public site stays at https://naka-names.onrender.com/.

## Publish
Merging to `main` does not happen from this branch by itself. To publish after review:

1. Merge the pull request into `main` on GitHub.
2. In Render, let the connected `naka-names` service deploy that commit. The Blueprint is `npm install --omit=dev` then `node server.mjs`, with health check `/api/health`.
3. Leave `SHIELDED_API_KEY` as it is in the Render dashboard (`sync: false` in `render.yaml`). Do not commit the key, and do not wipe `data/` on a running disk. A new instance rebuilds the registry from the API.
4. Confirm `/` loads, a name check returns, and `/api/health` is ok. The name fee is read live from the Shielded Vault registration service and is not stored in git.

## Local preview
Start: `./start.sh` (reads SHIELDED_API_KEY from /home/box/.secrets/shielded.env; PORT default 5188, HOST 127.0.0.1)
Files: server.mjs (no deps, Node 20+), rules.mjs (port of SHORD v1 src/v1/names.mjs), public/ (index.html, app.js, style.css), data/ (names cache, block times, log).
API use: polls open /names/info every 60 s (no key); fetches /names?after=<n> with the key only when count/digest changes, tail first, verifies the running digest.
Routes: / (?q=label) · /names · /<label>.<ending> · /<shord1 address> · /api/names · /api/check?q= · /api/name/<name> · /api/of/<addr> · /api/health

## Render (free web service)
`render.yaml` is a Blueprint: node runtime, `npm install --omit=dev` (no deps), `node server.mjs`, health check `/api/health`.
Render injects `PORT`; `HOST` is set to 0.0.0.0 there (local default stays 127.0.0.1). Set `SHIELDED_API_KEY` in the dashboard (sync: false).
Ephemeral disk + sleeping: `data/` is not committed. On each cold start the server creates `data/`, finds no cache, polls the free
`/names/info`, and refetches the list with the key (1 unit per 500 names, so 1 unit today), verifying the digest. Block dates are
refilled from mempool.space (free, ~2 calls per distinct block height, ~80 heights today, throttled 250 ms). The free plan sleeps after
~15 min idle; the first request after that waits for the cold start (~30-60 s) and the 60 s poll stops while asleep.
