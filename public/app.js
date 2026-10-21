import { blocksCard } from './blocks.js?v=8';
// .naka registry — client. Talks only to this server's /api/*. No keys here.
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (a) => a ? `${a.slice(0, 10)}…${a.slice(-6)}` : '';
const insc = (id) => `https://ordinals.com/inscription/${id}`;
const blockUrl = (h) => `https://mempool.space/block/${h}`;
const fmtDate = (t) => t ? new Date(t * 1000).toLocaleString(I18N.lang === 'zh-CN' ? 'zh-CN' : undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
const nameHtml = (full) => { const [l, e] = full.split('.'); return `${esc(l)}<span class="${e === 'shield' ? 'sh' : ''}">.${esc(e)}</span>`; };
const VAULT = 'https://ord-dropz.xyz/wallet';
const I18N = window.NAKA_I18N || { t: (_k, en) => en, reason: (en) => en, onChange() {} };
const tr = I18N.t;
let DATA = null;
let checkSeq = 0;

function track(name) {
  try {
    const fn = window.umami && window.umami.track;
    if (typeof fn === 'function') fn(name);
  } catch {}
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1400); }
async function copy(text) { try { await navigator.clipboard.writeText(text); } catch { const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); } toast(tr('toast.copied', 'Copied. Handle with care.')); }
document.addEventListener('click', (e) => {
  const vault = e.target.closest('a[href]');
  if (vault) {
    try {
      const u = new URL(vault.href, location.origin);
      if (u.origin === 'https://ord-dropz.xyz' && u.pathname.replace(/\/+$/, '') === '/wallet') track('vault-click');
    } catch {}
  }
  const c = e.target.closest('[data-copy]'); if (c) { e.preventDefault(); copy(c.dataset.copy); return; }
  const a = e.target.closest('a[data-link], a[href^="/"]');
  if (a && !a.target && a.origin === location.origin && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(a.getAttribute('href')); }
});
window.addEventListener('popstate', () => route());
function go(href) { history.pushState(null, '', href); route(); window.scrollTo(0, 0); }
async function load(force) {
  if (DATA && !force) return DATA;
  const r = await fetch('/api/names');
  if (!r.ok) throw new Error('registry unavailable');
  DATA = await r.json();
  setSync();
  return DATA;
}
function setSync() {
  if (!DATA) return;
  const h = DATA.info?.height;
  const count = DATA.verified ? DATA.stats.total : (Number.isFinite(DATA.info?.count) ? DATA.info.count : DATA.stats.total);
  const hl = `<a href="${blockUrl(h)}" target="_blank" rel="noopener">${h ?? '?'}</a>`;
  const st = DATA.verified ? `<span style="color:var(--lime)">${tr('sync.ok', 'digest verified ✓')}</span>` : `<span style="color:var(--amber)">${tr('sync.bad', 'digest unverified')}</span>`;
  $('#sync').innerHTML = tr('sync', `${count} names · indexed to block ${hl} · ${st}`, { count, h: hl, state: st });
}
let quiet = false; // re-render after a language switch must not re-fire analytics events
I18N.onChange(() => { setSync(); quiet = true; route().catch(() => {}).finally(() => { quiet = false; }); });
setInterval(() => load(true).catch(() => {}), 60_000);

function nav(which) { document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === which)); }

async function route() {
  const p = decodeURIComponent(location.pathname).replace(/\/+$/, '') || '/';
  document.title = p === '/names' ? tr('title.names', 'The register — .naka registry') : tr('title.home', '.naka registry — names of the shielded');
  await load();
  if (p === '/') return home();
  if (p === '/names') return directory();
  const seg = p.slice(1).toLowerCase();
  if (/^shord1[0-9a-f]{128}$/.test(seg)) return addressPage(seg);
  return namePage(seg);
}

// ---------- check ----------
const EXAMPLES = ['degen', 'punks', 'crypt', 'sats', 'pepe', 'ordinal'];
function listMode() {
  if (DATA.list === 'ready' || DATA.list === 'stale' || DATA.list === 'empty' || DATA.list === 'unavailable') return DATA.list;
  if (DATA.names.length && DATA.verified) return 'ready';
  if (DATA.names.length) return 'stale';
  if (DATA.verified && DATA.info?.count === 0) return 'empty';
  return 'unavailable';
}
function home() {
  nav('/');
  const s = DATA.stats, q = new URLSearchParams(location.search).get('q') ?? '';
  const mode = listMode();
  const unavailable = mode === 'unavailable';
  const lens = Object.entries(s.lengths).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]);
  const max = Math.max(1, ...lens.map((x) => x[1]));
  const takenThree = s.three.filter(Boolean).length;
  const recent = [...DATA.names].reverse().slice(0, 12);
  const showIndex = mode === 'ready' || mode === 'stale' || mode === 'empty';
  const indexed = Number.isFinite(DATA.info?.count) ? DATA.info.count : null;
  const dash = (n) => unavailable ? '—' : n;
  app.innerHTML = `
  <h1>${tr('home.h1', 'Claim a name<br>before <em>someone else</em> does.')}</h1>
  <p class="lede">${tr('home.lede', 'Discover your name in the world of Shielded Ordinals on Bitcoin.')}</p>
  <form class="check" id="f" autocomplete="off">
    <label class="inwrap"><input id="q" name="q" placeholder="${tr('home.ph', 'yourname(.naka)')}" value="${esc(q)}" spellcheck="false" autocapitalize="none" autocorrect="off" enterkeyhint="search" maxlength="40" aria-label="${tr('home.aria', 'Name to check')}"><span class="suf">.naka / .shield</span></label>
    <button>${tr('home.btn', 'Check')}</button>
  </form>
  <div class="chips">${EXAMPLES.map((c) => `<button type="button" data-q="${c}">${c}</button>`).join('')}</div>
  <div id="res" aria-live="polite"></div>
  <div class="stats">
    <div class="stat"><b>${dash(s.total)}</b><span>${tr('st.total', 'names claimed')}</span></div>
    <div class="stat"><b>${dash(s.perEnding.naka ?? 0)}</b><span>.naka</span></div>
    <div class="stat"><b>${dash(s.perEnding.shield ?? 0)}</b><span>.shield</span></div>
    <div class="stat"><b>${unavailable ? '—' : `${takenThree}<small class="dim" style="font-size:12px">/1000</small>`}</b><span>${tr('st.three', '3-digit taken')}</span></div>
  </div>
  <div id="blocks-card"></div>
  ${showIndex ? `
  <h2>${tr('home.fresh', 'Fresh plots')}</h2>
  <div class="recent">${recent.map((n) => `<a href="/${esc(n.name)}">${nameHtml(n.name)}</a>`).join('')}</div>
  <h2>${tr('home.grave', 'The 000–999 graveyard')}</h2>
  <div class="card">
    <div class="grid3">${s.three.map((t, i) => { const l = String(i).padStart(3, '0'); return t ? `<a class="t" href="/${t}" title="${tr('g.taken', `${t} — taken`, { n: t })}"></a>` : `<a href="/?q=${l}" title="${tr('g.free', `${l} — free`, { n: l })}"></a>`; }).join('')}</div>
    <div class="legend"><span><i style="background:var(--pink)"></i>${tr('g.lt', `taken (${takenThree})`, { n: takenThree })}</span><span><i style="background:#1b1b24"></i>${tr('g.lf', `free (${1000 - takenThree})`, { n: 1000 - takenThree })}</span><span>${tr('g.tap', 'tap a square')}</span></div>
  </div>
  <h2>${tr('home.len', 'Label length')}</h2>
  <div class="card"><div class="bars">${lens.map(([k, v]) => `<div style="height:${Math.max(4, (v / max) * 100)}%" title="${tr('len.title', `${v} names of length ${k}`, { v, k })}"><s>${v}</s><i>${k}</i></div>`).join('')}</div><div style="height:16px"></div></div>` : `<h2>${tr('home.reg', 'The register')}</h2><div class="empty">${tr('home.unavail', `The name list is unavailable on this server.${indexed == null ? '' : ` The index reports ${indexed} names.`} This is not an empty registry, and it is not a list of free names.`, { extra: indexed == null ? '' : tr('home.unavail.n', '', { n: indexed }) })}</div>`}
  <h2>${tr('sec.h2', 'Secure your .naka name')}</h2>
  <div class="secure">
    <p>${tr('sec.found', `Found a name that's available? Claim it through the <a class="vault" href="${VAULT}" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="registry" data-umami-event-label="shielded-vault">Shielded Vault</a>.`)}</p>
    <p>${tr('sec.reg2', 'Names are registered on Bitcoin, and the first valid inscription secures the name.')}</p>
    <p>${tr('sec.avail', 'Availability can change until registration is confirmed.')}</p>
    <p class="go"><a class="btn claim" href="${VAULT}" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="registry" data-umami-event-label="get-a-name">${tr('sec.get', 'Get a Name →')}</a></p>
    <p class="url"><a href="${VAULT}" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="registry" data-umami-event-label="wallet-url">ord-dropz.xyz/wallet</a></p>
  </div>`;
  const f = $('#f'), inp = $('#q');
  f.onsubmit = (e) => { e.preventDefault(); run(inp.value); };
  document.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { inp.value = b.dataset.q; run(b.dataset.q); });
  if (q) run(q);
  blocksCard($('#blocks-card'));
}

async function run(q) {
  q = q.trim(); const res = $('#res'); if (!res) return;
  const seq = ++checkSeq;
  history.replaceState(null, '', q ? `/?q=${encodeURIComponent(q)}` : '/');
  if (!q) { res.innerHTML = ''; return; }
  if (!quiet) track('name-check');
  res.innerHTML = `<div class="result"><p class="dim">${tr('chk.loading', 'Checking the register…')}</p></div>`;
  try {
    const r = await (await fetch(`/api/check?q=${encodeURIComponent(q)}`)).json();
    if (seq !== checkSeq) return;
    res.innerHTML = renderCheck(r);
  } catch {
    if (seq !== checkSeq) return;
    res.innerHTML = `<div class="result invalid"><p class="verdict">${tr('chk.unv', 'Unverified')}</p><p class="sub">${tr('chk.noanswer', 'The checker did not answer. This is not a registration result.')}</p></div>`;
  }
}

function renderCheck(r) {
  if (r.status === 'invalid') return `<div class="result invalid"><p class="verdict">${tr('chk.invalid', 'Not a name')}</p><p class="sub">${esc(I18N.reason(r.reason))}</p><p class="dim" style="font-size:12.5px">${tr('chk.rules', 'Rules: 3–20 characters · a–z, 0–9, single dashes between characters · ends in .naka or .shield.')}</p></div>`;
  if (r.status === 'reserved') return `<div class="result reserved"><p class="verdict">${tr('chk.reserved', 'Reserved')}</p><p class="sub">${tr('chk.reserved.sub', `<b>${esc(r.label)}</b> is on the house list. Nobody gets it under either ending, not even with flowers.`, { label: esc(r.label) })}</p><p class="dim" style="font-size:12.5px">${esc(I18N.reason(r.reason))}</p></div>`;
  if (r.status === 'pending') return `<div class="result pending"><p class="verdict">${tr('chk.pending', 'Pending')}</p><p class="sub">${tr('chk.pending.sub', `<b>${nameHtml(r.name)}</b> is paid for and waiting on a block. Body’s on the table; paperwork is processing.`, { name: nameHtml(r.name) })}</p></div>`;
  if (r.status === 'taken') {
    const h = r.holder;
    const lead = !r.verified
      ? tr('chk.cached', `A cached record lists <b>${nameHtml(h.name)}</b>, but the digest is not verified. Do not treat this as confirmed.`, { name: nameHtml(h.name) })
      : r.askedOtherEnding
        ? tr('chk.other', `You asked for <b>${nameHtml(r.asked)}</b>, but the label <b>${esc(r.label)}</b> already belongs to <b>${nameHtml(h.name)}</b>. One label, one owner, across both endings.`, { asked: nameHtml(r.asked), label: esc(r.label), holder: nameHtml(h.name) })
        : tr('chk.forever', `Already claimed, forever. No exhumation.`);
    const verdict = r.verified ? tr('chk.taken', 'Taken') : tr('chk.unv', 'Unverified');
    const klass = r.verified ? 'taken' : 'reserved';
    return `<div class="result ${klass}"><p class="verdict">${verdict}</p><p class="sub">${lead}</p>
      <div class="chips" style="margin:0 0 6px"><span class="pill" style="border-color:#a78bfa66;color:var(--text)">${tr('chk.holds', `${nameHtml(h.name)} ✓ holds it`, { name: nameHtml(h.name) })}</span>${r.blocked.map((b) => `<span class="pill x">${esc(b)}</span>`).join('')}</div>
      <dl class="kv">
        <dt>${tr('kv.name', 'Name')}</dt><dd><a href="/${esc(h.name)}">${nameHtml(h.name)}</a></dd>
        <dt>${tr('kv.claimed', 'Claimed')}</dt><dd><a href="${blockUrl(h.height)}" target="_blank" rel="noopener">${tr('kv.blockn', `block ${h.height}`, { h: h.height })}</a>${h.time ? `<span class="dim">${fmtDate(h.time)}</span>` : ''}</dd>
        <dt>${tr('kv.insc', 'Inscription')}</dt><dd><a href="${insc(h.id)}" target="_blank" rel="noopener">${esc(h.id.slice(0, 10))}…${esc(h.id.slice(-4))} ↗</a></dd>
        <dt>${tr('kv.points', 'Points at')}</dt><dd><a class="addr" href="/${esc(h.to)}">${short(h.to)}</a><button class="copy" data-copy="${esc(h.to)}">${tr('copy', 'copy')}</button></dd>
      </dl></div>`;
  }
  const confirmedFree = r.verified && r.mintAgrees === true && !r.mintConflict;
  if (!confirmedFree) {
    const why = r.mintConflict
      ? tr('chk.conflict', `The registration service reports a record for <b>${esc(r.label)}</b> that this index does not list yet. This is not a vacancy.`, { label: esc(r.label) })
      : tr('chk.notconf', `<b>${esc(r.label || r.input)}</b> is not confirmed. ${r.verified ? 'The registration service did not confirm that it is free.' : 'The registry digest is not verified on this load.'} This is not a statement that the name is free.`, { label: esc(r.label || r.input), why: r.verified ? tr('chk.why.mint', '') : tr('chk.why.digest', '') });
    return `<div class="result reserved"><p class="verdict">${tr('chk.unv', 'Unverified')}</p><p class="sub">${why}</p>
      <p class="note">${tr('chk.again', `Check again after the index verifies, or confirm in the <a href="${VAULT}" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="registry" data-umami-event-label="check-unverified">Shielded Vault</a> before you pay.`, { vault: VAULT })}</p></div>`;
  }
  const opts = r.options.map((o) => `<span class="pill ok">${esc(o)}</span>`).join(' ');
  return `<div class="result free"><p class="verdict">${tr('chk.free', 'Free')}</p><p class="sub">${tr('chk.free.sub', `<b>${esc(r.label)}</b> is unclaimed as of block ${r.height ?? '?'}. Vacancy in the plot. Pick one ending; the other gets locked with it.`, { label: esc(r.label), h: r.height ?? '?' })}</p>
    <div class="chips" style="margin:0">${opts}</div>
    <p class="note">${tr('chk.free.note', `Register it in the <a href="${VAULT}" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="registry" data-umami-event-label="check-free">Shielded Vault</a> (“Get a name”), or inscribe the record yourself. Whoever's inscription lands first wins, so “free” here is a snapshot, not a reservation.`, { vault: VAULT })}</p></div>`;
}

// ---------- directory ----------
function withRank() {
  const L = DATA.names.map((n, k) => ({ ...n, i: n.i ?? k }));
  if (L.every((n) => n.rank)) return L;
  [...L].sort((a, b) => a.height - b.height || a.i - b.i).forEach((n, k) => { n.rank = k + 1; });
  return L;
}
const F = { q: '', end: 'all', len: 'all', kind: 'all', sort: 'first' };
const SORTS = ['first', 'last', 'az', 'short'];
const VIEWS = [['first', 'First created'], ['newest', 'Newest'], ['naka', '.naka only'], ['shield', '.shield only']];
const viewLabel = (v, en) => tr(`v.${v}`, en);
const VIEW_SET = { first: { end: 'all', sort: 'first' }, newest: { end: 'all', sort: 'last' }, naka: { end: 'naka', sort: 'first' }, shield: { end: 'shield', sort: 'first' } };
const viewOf = () => F.end === 'naka' || F.end === 'shield' ? (F.sort === 'first' ? F.end : null) : F.sort === 'first' ? 'first' : F.sort === 'last' ? 'newest' : null;
function syncSeg() { const v = viewOf(); document.querySelectorAll('#seg [data-view]').forEach((b) => { const on = b.dataset.view === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }
const SORT_ALIAS = { old: 'first', oldest: 'first', new: 'last', newest: 'last' };
function directory() {
  nav('/names');
  const sp = new URLSearchParams(location.search);
  for (const k of Object.keys(F)) if (sp.get(k)) F[k] = sp.get(k);
  F.sort = SORT_ALIAS[F.sort] ?? F.sort; if (!SORTS.includes(F.sort)) F.sort = 'first';
  const lens = [...new Set(DATA.names.map((n) => n.label.length))].sort((a, b) => a - b);
  app.innerHTML = `
  <h1>${tr('dir.h1', 'The <em>register</em>')}</h1>
  <p class="lede">${tr('dir.lede', 'Every shielded name, .naka and .shield together, in the order Bitcoin buried them. <b>#1</b> claimed first.')}</p>
  <div class="seg" id="seg" role="group" aria-label="${tr('dir.show', 'Show')}">${VIEWS.map(([v, t]) => `<button type="button" data-view="${v}" aria-pressed="false">${viewLabel(v, t)}</button>`).join('')}</div>
  <div class="filters">
    <input id="fq" type="search" placeholder="${tr('f.ph', 'search names…')}" value="${esc(F.q)}" aria-label="${tr('f.search', 'Search')}" autocapitalize="none" spellcheck="false">
    <select id="fe" aria-label="${tr('f.ending', 'Ending')}"><option value="all">${tr('f.allend', 'all endings')}</option><option value="naka">.naka</option><option value="shield">.shield</option></select>
    <select id="fl" aria-label="${tr('f.length', 'Length')}"><option value="all">${tr('f.anylen', 'any length')}</option>${lens.map((l) => `<option value="${l}">${tr('f.chars', `${l} chars`, { n: l })}</option>`).join('')}</select>
    <select id="fk" aria-label="${tr('f.kind', 'Kind')}"><option value="all">${tr('f.anychars', 'any chars')}</option><option value="digits">${tr('f.digits', 'digits only')}</option><option value="letters">${tr('f.letters', 'letters only')}</option><option value="mixed">${tr('f.mixed', 'mixed')}</option></select>
    <select id="fs" aria-label="${tr('f.sort', 'Sort')}"><option value="first">${tr('s.first', 'First claimed')}</option><option value="last">${tr('s.last', 'Latest claimed')}</option><option value="az">A → Z</option><option value="short">${tr('s.short', 'Shortest')}</option></select>
  </div>
  <div class="count" id="cnt"></div>
  <table><thead><tr><th class="rk" title="${tr('th.rank', 'Claim rank: #1 = first claimed')}">#</th><th>${tr('kv.name', 'Name')}</th><th>${tr('kv.block', 'Block')}</th><th class="hide-m">${tr('kv.insc', 'Inscription')}</th><th>${tr('kv.points', 'Points at')}</th></tr></thead><tbody id="rows"></tbody></table>
  <h2>${tr('dir.rev', 'Reverse lookup')}</h2>
  <p class="dim" style="margin:0;font-size:13px">${tr('dir.rev.p', 'Paste a shielded address (shord1…) to see which names point at it.')}</p>
  <form class="rev" id="rf"><input id="ra" placeholder="shord1…" spellcheck="false" autocapitalize="none" aria-label="${tr('dir.rev.aria', 'Shielded address')}"><button>${tr('dir.rev.btn', 'Look up')}</button></form>
  <div id="rres"></div>`;
  $('#fe').value = F.end; $('#fl').value = F.len; $('#fk').value = F.kind; $('#fs').value = F.sort;
  const upd = () => { F.q = $('#fq').value.trim().toLowerCase(); F.end = $('#fe').value; F.len = $('#fl').value; F.kind = $('#fk').value; F.sort = $('#fs').value; draw(); const u = new URLSearchParams(Object.entries(F).filter(([k, v]) => v && v !== 'all' && !(k === 'sort' && v === 'first'))); history.replaceState(null, '', `/names${u.size ? '?' + u : ''}`); };
  ['#fq', '#fe', '#fl', '#fk', '#fs'].forEach((s) => $(s).addEventListener('input', upd));
  document.querySelectorAll('#seg [data-view]').forEach((b) => b.onclick = () => { const v = VIEW_SET[b.dataset.view]; $('#fe').value = v.end; $('#fs').value = v.sort; upd(); });
  $('#rf').onsubmit = (e) => { e.preventDefault(); const a = $('#ra').value.trim().toLowerCase(); if (/^shord1[0-9a-f]{128}$/.test(a)) go(`/${a}`); else $('#rres').innerHTML = `<div class="result invalid" style="margin-top:10px"><p class="sub" style="margin:0">${tr('dir.rev.bad', "That's not a shielded address. Those start with <b>shord1</b> and run 128 hex characters after it.")}</p></div>`; };
  draw();
}
function draw() {
  let L = withRank();
  if (F.q) L = L.filter((n) => n.name.includes(F.q));
  if (F.end !== 'all') L = L.filter((n) => n.ending === F.end);
  if (F.len !== 'all') L = L.filter((n) => n.label.length === Number(F.len));
  if (F.kind === 'digits') L = L.filter((n) => /^\d+$/.test(n.label));
  if (F.kind === 'letters') L = L.filter((n) => /^[a-z]+$/.test(n.label));
  if (F.kind === 'mixed') L = L.filter((n) => !/^\d+$/.test(n.label) && !/^[a-z]+$/.test(n.label));
  const s = { first: (a, b) => a.rank - b.rank, last: (a, b) => b.rank - a.rank, az: (a, b) => a.name.localeCompare(b.name), short: (a, b) => a.label.length - b.label.length || a.name.localeCompare(b.name) }[F.sort] ?? ((a, b) => a.rank - b.rank);
  L.sort(s);
  syncSeg();
  const mode = listMode();
  const indexed = Number.isFinite(DATA.info?.count) ? DATA.info.count : null;
  $('#cnt').textContent = mode === 'unavailable'
    ? (indexed == null ? tr('cnt.unavail', 'Name list unavailable') : tr('cnt.unavail.n', `Name list unavailable · index reports ${indexed} names`, { n: indexed }))
    : tr('cnt', `${L.length} of ${DATA.names.length} names`, { n: L.length, total: DATA.names.length });
  const label = F.q.replace(/\.(naka|shield)$/, '');
  const free = DATA.verified && F.q && /^[a-z0-9-]{3,20}$/.test(label) && !DATA.names.some((n) => n.label === label);
  const empty = mode === 'unavailable'
    ? tr('dir.unavail', `The name list is unavailable on this server.${F.q ? ` <a href="/?q=${encodeURIComponent(F.q)}">Check “${esc(F.q)}”.</a>` : ''} This is not an empty registry.`, { link: F.q ? tr('dir.unavail.link', '', { href: `/?q=${encodeURIComponent(F.q)}`, q: esc(F.q) }) : '' })
    : tr('dir.none', `No bodies here.${free ? ` <a href="/?q=${encodeURIComponent(F.q)}">“${esc(F.q)}” looks free — check it →</a>` : ''}`, { link: free ? tr('dir.none.link', '', { href: `/?q=${encodeURIComponent(F.q)}`, q: esc(F.q) }) : '' });
  $('#rows').innerHTML = L.length ? L.map((n) => `<tr>
    <td class="rk">#${n.rank}</td>
    <td class="nm"><a href="/${esc(n.name)}">${nameHtml(n.name)}</a></td>
    <td><a href="${blockUrl(n.height)}" target="_blank" rel="noopener" title="${esc(fmtDate(n.time) ?? '')}">${n.height}</a></td>
    <td class="hide-m"><a href="${insc(n.id)}" target="_blank" rel="noopener">${esc(n.id.slice(0, 8))}… ↗</a></td>
    <td><button class="copy" data-copy="${esc(n.to)}" title="${esc(n.to)}"><span class="hide-m">${esc(n.to.slice(6, 12))}</span>…${esc(n.to.slice(-4))} ⧉</button></td></tr>`).join('')
    : `<tr><td colspan="5"><div class="empty">${empty}</div></td></tr>`;
}

// ---------- name & address pages ----------
async function namePage(seg) {
  nav('');
  const r = await fetch(`/api/name/${encodeURIComponent(seg)}`);
  if (r.status !== 200) {
    const j = await r.json().catch(() => ({}));
    app.innerHTML = `<p><a href="/names">${tr('np.back', '← register')}</a></p><div class="big">${/^[a-z0-9.-]+$/.test(seg) && seg.includes('.') ? nameHtml(seg) : esc(seg)}</div>${j.check ? renderCheck(j.check) : `<div class="empty">${tr('np.nothing', 'Nothing buried here.')}</div>`}`;
    return;
  }
  const n = await r.json();
  const others = n.ending === 'naka' ? `${n.label}.shield` : `${n.label}.naka`;
  const rk = n.rank ?? withRank().find((x) => x.name === n.name)?.rank;
  const same = DATA.names.filter((x) => x.to === n.to && x.name !== n.name);
  document.title = tr('title.name', `${n.name} — .naka registry`, { name: n.name });
  app.innerHTML = `<p><a href="/names">${tr('np.back', '← register')}</a></p>
  <p class="dim" style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.2em">${tr('np.rank', `Claimed <b class="rank">#${rk ?? '?'}</b> of ${DATA.names.length}`, { rk: rk ?? '?', total: DATA.names.length })}</p>
  <div class="big">${nameHtml(n.name)}</div>
  <p class="dim" style="margin:0">${tr('np.at', `Claimed at block ${n.height}${n.time ? ` · ${fmtDate(n.time)}` : ''}. <span class="pill x">${esc(others)}</span> is locked with it.`, { h: n.height, date: n.time ? ` · ${fmtDate(n.time)}` : '', other: esc(others) })}</p>
  <div class="card">
    <dl class="kv" style="margin:0">
      <dt>${tr('kv.points', 'Points at')}</dt><dd><span class="addr">${esc(n.to)}</span></dd>
      <dt></dt><dd><button class="copy" data-copy="${esc(n.to)}">${tr('np.copyaddr', 'copy address')}</button><button class="copy" data-copy="${esc(n.name)}">${tr('np.copyname', 'copy name')}</button><a class="copy btn ghost" href="/${esc(n.to)}">${tr('np.vault', 'all names for this vault')}</a></dd>
      <dt>${tr('kv.block', 'Block')}</dt><dd><a href="${blockUrl(n.height)}" target="_blank" rel="noopener">${n.height} ↗</a></dd>
      <dt>${tr('kv.insc', 'Inscription')}</dt><dd><a href="${insc(n.id)}" target="_blank" rel="noopener">${esc(n.id)} ↗</a></dd>
    </dl>
  </div>
  ${same.length ? `<h2>${tr('np.also', 'Also points here')}</h2><div class="recent">${same.map((x) => `<a href="/${esc(x.name)}">${nameHtml(x.name)}</a>`).join('')}</div>` : ''}
  <h2>${tr('np.send', 'Send to a .naka name')}</h2>
  <div class="sendto">
    <p>${tr('np.send1', `Want to send a Shielded Ordinal to <b>${nameHtml(n.name)}</b>?`, { name: nameHtml(n.name) })}</p>
    <p>${tr('np.send2', `Simply open the <a class="vault" href="${VAULT}" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="registry" data-umami-event-label="shielded-vault">Shielded Vault</a>, enter <b>${nameHtml(n.name)}</b> in the Send field, and follow the steps to complete your transfer.`, { vault: VAULT, name: nameHtml(n.name) })}</p>
    <p>${tr('np.send3', 'Your .naka name serves as a destination for receiving Shielded Ordinals on Bitcoin.')}</p>
  </div>`;
}

async function addressPage(a) {
  nav('');
  const j = await (await fetch(`/api/of/${a}`)).json();
  app.innerHTML = `<p><a href="/names">${tr('np.back', '← register')}</a></p>
  <p class="dim" style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.2em">${tr('ap.label', 'Shielded address')}</p>
  <div class="card"><span class="addr">${esc(a)}</span> <button class="copy" data-copy="${esc(a)}">${tr('copy', 'copy')}</button></div>
  <h2>${j.names?.length ? tr('ap.count', `${j.names.length} name${j.names.length > 1 ? 's' : ''} point here`, { n: j.names.length }) : tr('ap.none', 'No names')}</h2>
  ${j.names?.length ? `<div class="recent">${j.names.map((x) => `<a href="/${esc(x.name)}">${nameHtml(x.name)}</a>`).join('')}</div>` : `<div class="empty">${tr('ap.anon', 'Anonymous. No headstone. Which is rather the point of shielded.')}</div>`}
  <p class="note">${tr('ap.note', 'What a vault holds is private; this only shows public name records pointing at it.')}</p>`;
}

route().catch((e) => { app.innerHTML = `<div class="empty">${tr('err.index', `The index didn't answer. ${esc(e.message)}`, { msg: esc(e.message) })}</div>`; });
