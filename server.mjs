// .naka checker + directory — local preview server. No deps. Node 20+.
// The API key stays here (env SHIELDED_API_KEY); the browser only ever sees /api/* on this server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { classify, isShieldedAddress, RESERVED_LABELS, NAME_ENDINGS } from './rules.mjs';

import { stakingInfo } from './staking.mjs';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5188);
// Render (and similar hosts) set RENDER=true and need 0.0.0.0; local default stays loopback-only.
const HOST = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');
const API = (process.env.SHIELDED_API || 'https://shielded-public-api-production.up.railway.app').replace(/\/+$/, '');
const MINT = 'https://shielded-mint-server-production.up.railway.app/api/shielded/names';
const MEMPOOL = 'https://mempool.space/api';
const KEY = process.env.SHIELDED_API_KEY || '';
const POLL_MS = Number(process.env.POLL_MS || 60_000);
const CACHE = path.join(DIR, 'data', 'names-cache.json');
const TIMES = path.join(DIR, 'data', 'block-times.json');
const GENESIS = crypto.createHash('sha256').update('shord-names-v1').digest('hex');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const log = (...a) => console.log(new Date().toISOString(), ...a);
fs.mkdirSync(path.join(DIR, 'data'), { recursive: true }); // fresh deploys start without the cache dir

// ---- state -------------------------------------------------------------
let state = { info: null, names: [], verified: false, fetchedAt: null, lastPollAt: null, lastPollOk: null };
let keyedUnits = 0; // keyed calls this process made (each is 1 unit)
let times = {}; // height -> unix seconds
try { state = { ...state, ...JSON.parse(fs.readFileSync(CACHE, 'utf8')) }; log(`cache: ${state.names.length} names`); } catch { log('cache: none'); }
try { times = JSON.parse(fs.readFileSync(TIMES, 'utf8')); } catch {}
let byLabel = new Map(), byAddr = new Map(), rankOf = new Map();
// Claim rank: first claimed = #1. Order by registration block height, then by the API list index `i`
// (the protocol's canonical order within a block). Fixed for a name regardless of any filter or sort.
function reindex() {
  byLabel = new Map(); byAddr = new Map(); rankOf = new Map();
  state.names.forEach((n, k) => { if (typeof n.i !== 'number') n.i = k; }); // older caches dropped `i`; list position == i
  [...state.names].sort((a, b) => a.height - b.height || a.i - b.i).forEach((n, k) => rankOf.set(n.name, k + 1));
  for (const n of state.names) {
    const label = n.name.split('.')[0];
    byLabel.set(label, n);
    const a = byAddr.get(n.to); if (a) a.push(n); else byAddr.set(n.to, [n]);
  }
}
reindex();

function verifyChain(names, digest) {
  let d = GENESIS;
  for (const n of names) d = sha(`${d}|${n.height}|${n.id}|${n.name}|${n.to}`);
  return d === digest;
}
state.verified = !!state.info && verifyChain(state.names, state.info.digest);

async function getJson(url, { keyed = false, timeout = 15000 } = {}) {
  const headers = { 'accept-encoding': 'gzip, br' };
  if (keyed) { if (!KEY) throw new Error('no API key in env'); headers['x-api-key'] = KEY; keyedUnits++; }
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

// ---- polling: free /names/info, keyed /names?after= only on change ------
let polling = false;
async function poll() {
  if (polling) return; polling = true;
  try {
    const { status, body: info } = await getJson(`${API}/names/info`); // open route, no key, not counted against ours
    if (status !== 200 || typeof info.count !== 'number') throw new Error(`/names/info ${status}`);
    state.lastPollAt = Date.now(); state.lastPollOk = true;
    const changed = !state.info || info.digest !== state.info.digest || info.count !== state.names.length;
    if (!changed) { state.info = info; state.verified = verifyChain(state.names, info.digest); return; }
    log(`names changed: ${state.names.length} -> ${info.count}; refetching`);
    // Keep the open index head even if the keyed list cannot be loaded. Do not treat a partial list as verified.
    state.info = info;
    state.verified = false;
    // the list is append-only except on reorg: try to fetch only the new tail, verify the whole chain, else refetch from 0
    let names = [];
    for (const start of state.names.length && state.names.length <= info.count ? [state.names.length, 0] : [0]) {
      names = start ? state.names.slice(0, start) : [];
      let after = start, page, ok = true;
      do {
        const r = await getJson(`${API}/names?after=${after}`, { keyed: true });
        if (r.status !== 200) { ok = false; break; }
        page = r.body; names.push(...page.names.map((n, k) => ({ ...n, i: typeof n.i === 'number' ? n.i : names.length + k }))); after = page.next;
      } while (after !== null && after !== undefined);
      if (ok && verifyChain(names, page.digest)) { info.digest = page.digest; info.count = page.count; info.height = page.height; break; }
      names = null;
    }
    if (!names) throw new Error('fetched list did not verify against the digest');
    state = { ...state, info, names, verified: true, fetchedAt: Date.now() };
    reindex();
    fs.writeFileSync(CACHE + '.tmp', JSON.stringify({ info: state.info, names: state.names, fetchedAt: state.fetchedAt }));
    fs.renameSync(CACHE + '.tmp', CACHE);
    log(`now ${names.length} names, verified; keyed units used this run: ${keyedUnits}`);
    fillTimes();
  } catch (e) { state.lastPollOk = false; log('poll:', e.message); }
  finally { polling = false; }
}

// block heights -> dates, via mempool.space (public, no key), cached on disk forever
let filling = false;
async function fillTimes() {
  if (filling) return; filling = true;
  try {
    const need = [...new Set(state.names.map((n) => n.height))].filter((h) => !times[h]);
    for (const h of need) {
      try {
        const hash = (await (await fetch(`${MEMPOOL}/block-height/${h}`, { signal: AbortSignal.timeout(10000) })).text()).trim();
        const b = await (await fetch(`${MEMPOOL}/block/${hash}`, { signal: AbortSignal.timeout(10000) })).json();
        if (b?.timestamp) times[h] = b.timestamp;
      } catch { break; }
      await new Promise((r) => setTimeout(r, 250));
    }
    fs.writeFileSync(TIMES, JSON.stringify(times));
  } finally { filling = false; }
}

// ---- pending (paid, not yet confirmed) via the mint server, server-side, cached ----
const pendCache = new Map();
async function mintLookup(full) {
  const c = pendCache.get(full);
  if (c && Date.now() - c.at < 30_000) return c.v;
  let v = null;
  try {
    const { status, body } = await getJson(`${MINT}/${encodeURIComponent(full)}`, { timeout: 6000 });
    if (status === 200 && body.pending) v = { pending: true, address: body.address ?? null };
    else if (status === 200) v = { pending: false, taken: true };
    else if (status === 404) v = { pending: false, available: body.available !== false };
  } catch {}
  pendCache.set(full, { at: Date.now(), v });
  return v;
}

const pub = (n) => n && ({ name: n.name, label: n.name.split('.')[0], ending: n.name.split('.')[1], to: n.to, id: n.id, height: n.height, i: n.i, rank: rankOf.get(n.name) ?? null, time: times[n.height] ?? null });

async function check(q) {
  const c = classify(q);
  if (!c.ok) return { status: 'invalid', input: q, label: c.label ?? '', reason: c.reason, verified: state.verified };
  if (c.reserved) return { status: 'reserved', input: q, label: c.label, reason: 'On the protocol’s reserved list (it would pass for the platform, the protocol or a wallet). Nobody can take it, under either ending.', verified: state.verified };
  const holder = byLabel.get(c.label);
  const asked = c.ending ? `${c.label}.${c.ending}` : null;
  if (holder) {
    const blocked = NAME_ENDINGS.map((e) => `${c.label}.${e}`).filter((f) => f !== holder.name);
    return { status: 'taken', input: q, label: c.label, asked, holder: pub(holder), blocked, askedOtherEnding: !!asked && asked !== holder.name, verified: state.verified };
  }
  // Locally absent. Ask the registration service about both endings: a label taken as .shield
  // still blocks .naka. A service record is not the verified index, so the client must not call it registered.
  const prefer = c.ending ?? 'naka';
  const other = prefer === 'naka' ? 'shield' : 'naka';
  let looked = prefer;
  let m = await mintLookup(`${c.label}.${prefer}`);
  if (!m?.pending && !m?.taken && m?.available !== true) {
    const alt = await mintLookup(`${c.label}.${other}`);
    if (alt?.pending || alt?.taken) { m = alt; looked = other; }
  }
  if (m?.pending) return { status: 'pending', input: q, label: c.label, asked, name: `${c.label}.${looked}`, verified: state.verified };
  return {
    status: 'free', input: q, label: c.label, asked,
    options: NAME_ENDINGS.map((e) => `${c.label}.${e}`),
    mintAgrees: m ? m.available === true && !m.taken : null,
    mintConflict: m?.taken === true,
    verified: state.verified,
    height: state.info?.height ?? null,
  };
}

function listState() {
  if (state.names.length && state.verified) return 'ready';
  if (state.names.length) return 'stale';
  if (state.verified && state.info?.count === 0) return 'empty';
  return 'unavailable';
}

function stats() {
  const n = state.names, per = {}, len = {};
  for (const x of n) { const [l, e] = x.name.split('.'); per[e] = (per[e] || 0) + 1; len[l.length] = (len[l.length] || 0) + 1; }
  const three = []; for (let i = 0; i < 1000; i++) { const l = String(i).padStart(3, '0'); const h = byLabel.get(l); three.push(h ? h.name : 0); }
  return { total: n.length, perEnding: per, lengths: len, addresses: byAddr.size, digitsOnly: n.filter((x) => /^\d+$/.test(x.name.split('.')[0])).length, three };
}

// Public quote the Shielded Vault reads before "Get a name" (no API key).
// fee and network are sats, as the vault labels them. Postage is not in this response.
let regCache = { at: 0, ttl: 0, value: undefined };
async function registrationInfo() {
  if (regCache.value !== undefined && Date.now() - regCache.at < regCache.ttl) return regCache.value;
  try {
    const { status, body } = await getJson(`${MINT}/info`, { timeout: 4000 });
    if (status !== 200 || !Number.isFinite(Number(body?.fee))) throw new Error(`/names/info ${status}`);
    regCache = {
      at: Date.now(),
      ttl: 60_000,
      value: {
        enabled: body.enabled === true,
        feeSats: Number(body.fee),
        networkSats: Number.isFinite(Number(body.network)) ? Number(body.network) : null,
        endings: Array.isArray(body.endings) ? body.endings.filter((e) => typeof e === 'string') : [],
        checkedAt: Date.now(),
      },
    };
  } catch (e) {
    log('registration quote:', e.message);
    regCache = { at: Date.now(), ttl: 15_000, value: regCache.value === undefined ? null : regCache.value };
  }
  return regCache.value;
}

// ---- Bitcoin tip height for the halving watch (public, no key, ~60s cache) ----
// Halvings every 210,000 blocks (840,000 = 2024); target is the next one after the tip (1,050,000 now).
const HALVING_INTERVAL = 210000;
const TIP_SOURCES = [['mempool.space', 'https://mempool.space/api/blocks/tip/height'], ['blockstream.info', 'https://blockstream.info/api/blocks/tip/height']];
let tip = { height: null, fetchedAt: null, source: null, at: 0 };
async function blocksInfo() {
  let stale = false;
  if (!tip.height || Date.now() - tip.at > 60_000) {
    let got = null;
    for (const [source, url] of TIP_SOURCES) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
        const t = (await r.text()).trim();
        if (r.ok && /^\d+$/.test(t)) { got = { height: Number(t), fetchedAt: Date.now(), source, at: Date.now() }; break; }
      } catch {}
    }
    if (got) tip = got;
    else { stale = true; tip.at = Date.now() - 45_000; } // retry in ~15s
  }
  await refreshAvg();
  const h = tip.height;
  const epoch = h == null ? null : Math.floor(h / HALVING_INTERVAL);
  const target = epoch == null ? 1050000 : (epoch + 1) * HALVING_INTERVAL;
  const subsidy = epoch == null ? null : 50 / 2 ** epoch;
  const left = h == null ? null : target - h;
  const avgMs = avg.ms || 600_000;
  const at = (ms) => left == null ? null : tip.fetchedAt + left * ms;
  const range = left == null ? null : [at(Math.min(avgMs, 600_000)), at(Math.max(avgMs, 600_000))];
  return { height: h, target, epochStart: target - HALVING_INTERVAL, blocksRemaining: left, estimatedAt: at(600_000), estimatedRange: range, avgBlockMs: avgMs, avgSource: avg.ms ? 'mempool.space difficulty-adjustment timeAvg' : 'fallback 10 min', estimate: '~10 min/block', subsidyBtc: subsidy, nextSubsidyBtc: subsidy == null ? null : subsidy / 2, reached: false, staking: stakingInfo(h, avgMs), fetchedAt: tip.fetchedAt, source: tip.source, stale: stale || h == null };
}

// recent average block time (mempool.space, ~10 min cache); null -> fallback 10 min
let avg = { ms: null, at: 0 };
async function refreshAvg() {
  if (Date.now() - avg.at < 600_000) return;
  avg.at = Date.now() - 540_000; // on failure retry in ~1 min
  try {
    const r = await fetch('https://mempool.space/api/v1/difficulty-adjustment', { signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    if (r.ok && j.timeAvg > 60_000 && j.timeAvg < 3_600_000) avg = { ms: j.timeAvg, at: Date.now() };
  } catch {}
}

// ---- http --------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
// Old Render address forwards permanently to the custom domain (path + query kept).
const OLD_HOST = 'naka-names.onrender.com', NEW_ORIGIN = 'https://naka-names.xyz';
const server = http.createServer(async (req, res) => {
  try {
    const host = String(req.headers.host || '').toLowerCase().split(':')[0];
    if (host === OLD_HOST && (req.method === 'GET' || req.method === 'HEAD') && !req.url.startsWith('/api/health')) {
      res.writeHead(301, { location: NEW_ORIGIN + req.url, 'cache-control': 'public, max-age=3600' });
      return res.end();
    }
    const u = new URL(req.url, 'http://x');
    const p = decodeURIComponent(u.pathname);
    if (p === '/api/names') {
      const registration = await registrationInfo();
      return send(res, 200, { info: state.info, verified: state.verified, list: listState(), lastPollAt: state.lastPollAt, lastPollOk: state.lastPollOk, names: state.names.map(pub), stats: stats(), registration });
    }
    if (p === '/api/check') return send(res, 200, await check(u.searchParams.get('q') ?? ''));
    if (p.startsWith('/api/name/')) {
      const c = classify(p.slice(10));
      const h = c.ok && byLabel.get(c.label);
      if (!h || (c.ending && h.name !== `${c.label}.${c.ending}`)) return send(res, 404, { error: 'nobody has that name', check: await check(p.slice(10)) });
      return send(res, 200, pub(h));
    }
    if (p.startsWith('/api/of/')) {
      const a = p.slice(8).trim().toLowerCase();
      if (!isShieldedAddress(a)) return send(res, 400, { error: 'not a shielded address (shord1 + 128 hex)' });
      return send(res, 200, { address: a, names: (byAddr.get(a) ?? []).map(pub) });
    }
    if (p === '/api/blocks') return send(res, 200, await blocksInfo());
    if (p === '/secure') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); return fs.createReadStream(path.join(DIR, 'public', 'secure.html')).pipe(res); }
    if (p === '/blocks') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); return fs.createReadStream(path.join(DIR, 'public', 'blocks.html')).pipe(res); }
    if (p === '/api/health') return send(res, 200, { ok: true, names: state.names.length, height: state.info?.height, keyedUnitsThisRun: keyedUnits });
    // static, else the SPA shell (/, /names, /obi.naka, /shord1…)
    const f = path.join(DIR, 'public', path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (p !== '/' && f.startsWith(path.join(DIR, 'public')) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      return fs.createReadStream(f).pipe(res);
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    fs.createReadStream(path.join(DIR, 'public', 'index.html')).pipe(res);
  } catch (e) { log('req:', e.message); send(res, 500, { error: 'server error' }); }
});
server.listen(PORT, HOST, () => log(`.naka preview on http://${HOST}:${PORT} (key ${KEY ? 'loaded' : 'MISSING'})`));
poll(); setInterval(poll, POLL_MS);
fillTimes();
