// NAMES.NAKA — client. Talks only to this server's /api/*. No keys here.
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (a) => a ? `${a.slice(0, 10)}…${a.slice(-6)}` : '';
const insc = (id) => `https://ordinals.com/inscription/${id}`;
const blockUrl = (h) => `https://mempool.space/block/${h}`;
const fmtDate = (t) => t ? new Date(t * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
const fmtSats = (n) => `${Number(n).toLocaleString('en-US')} sats`;
const nameHtml = (full) => { const [l, e] = full.split('.'); return `${esc(l)}<span class="${e === 'shield' ? 'sh' : ''}">.${esc(e)}</span>`; };
const VAULT = 'https://ord-dropz.xyz/wallet';
const DROPZ = 'https://ord-dropz.xyz/';
const DEVS = 'https://ord-dropz.xyz/developers';
const PROTOCOL = 'https://github.com/Fl1ntstowned/shielded-ordinals';
const NAMES_SRC = 'https://github.com/Fl1ntstowned/shielded-ordinals/blob/main/src/v1/names.mjs';
const API_DOC = 'https://github.com/Fl1ntstowned/shielded-ordinals/blob/main/docs/API.md';
const COLLECTION = 'https://ord-dropz.xyz/secondary/collections/shielded-nakas-mupv6wja';
let DATA = null;
let checkSeq = 0;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 1600);
}
async function copy(text, kind) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(kind === 'name' ? 'Name copied' : kind === 'address' ? 'Address copied' : 'Copied');
}
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-copy]');
  if (c) { e.preventDefault(); copy(c.dataset.copy, c.dataset.kind); return; }
  const a = e.target.closest('a[data-link], a[href^="/"]');
  if (a && !a.target && a.origin === location.origin && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    go(a.getAttribute('href'));
  }
});
window.addEventListener('popstate', () => route());
function go(href) { history.pushState(null, '', href); route(); window.scrollTo(0, 0); }

async function load(force) {
  if (DATA && !force) return DATA;
  const r = await fetch('/api/names');
  if (!r.ok) throw new Error('The registry did not answer');
  DATA = await r.json();
  const h = DATA.info?.height;
  const reported = DATA.info?.count;
  const total = DATA.stats?.total ?? 0;
  const state = DATA.verified
    ? '<span class="oktxt">digest verified</span>'
    : '<span class="warntxt">name list not verified</span>';
  const countBit = DATA.verified
    ? `${total} names in the public registry`
    : (Number.isFinite(reported) ? `Public index reports ${reported} names` : 'Public registry not loaded yet');
  $('#sync').innerHTML = `${countBit}${h ? ` · indexed to block <a href="${blockUrl(h)}" target="_blank" rel="noopener noreferrer">${h}</a>` : ''} · ${state}`;
  return DATA;
}
setInterval(() => load(true).catch(() => {}), 60_000);

function nav(which) { document.querySelectorAll('header nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === which)); }
function titleFor(p, seg) {
  if (p === '/') return 'NAMES.NAKA — The Shielded Name Directory';
  if (p === '/names') return 'Directory — NAMES.NAKA';
  return `${seg} — NAMES.NAKA`;
}

let primed = false;
async function route() {
  const p = decodeURIComponent(location.pathname).replace(/\/+$/, '') || '/';
  document.title = titleFor(p, p.slice(1));
  await load();
  if (!primed && !DATA.verified) {
    primed = true;
    const hadInfo = !!DATA.info;
    setTimeout(async () => {
      const was = DATA.verified;
      await load(true).catch(() => {});
      const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (!typing && (DATA.verified !== was || (!hadInfo && DATA.info))) route();
    }, 2500);
  }
  if (p === '/') return home();
  if (p === '/names') return directory();
  const seg = p.slice(1).toLowerCase();
  document.title = titleFor(p, seg);
  if (/^shord1[0-9a-f]{128}$/.test(seg)) return addressPage(seg);
  return namePage(seg);
}

const EXAMPLES = ['degen', 'punks', 'crypt', 'sats', 'pepe', 'ordinal'];

function ext(href, text, cls) {
  return `<a class="${cls || ''}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
}

function home() {
  nav('/');
  const s = DATA.stats;
  const q = new URLSearchParams(location.search).get('q') ?? '';
  const lens = Object.entries(s.lengths).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]);
  const max = Math.max(1, ...lens.map((x) => x[1]));
  const takenThree = s.three.filter(Boolean).length;
  const recent = [...DATA.names].reverse().slice(0, 12);
  const reported = DATA.info?.count;
  const verifiedNote = DATA.verified
    ? 'Counts are from the verified public registry.'
    : (Number.isFinite(reported)
      ? `The public index reports ${reported} names. This server has not verified the name list, so the breakdown below is only what is loaded here (${s.total}). Name checks stay unverified until that list verifies.`
      : 'The registry digest is not verified on this load. Treat the counts as incomplete.');
  app.innerHTML = `
  <header class="hero">
    <h1>NAMES.NAKA</h1>
    <p class="kicker">The Shielded Name Directory</p>
    <p class="tagline">Your name. Your identity.</p>
    <p class="attrib">Built on Shielded · Powered by Ord Dropz</p>
  </header>
  <p class="lede">Check a <b>.naka</b> or <b>.shield</b> label against the public registry, and browse names that are already registered. A result is only as current as the last indexed block.</p>
  <form class="check" id="f" autocomplete="off">
    <label class="inwrap"><span class="sr">Name to check</span><input id="q" name="q" placeholder="name" value="${esc(q)}" spellcheck="false" autocapitalize="none" autocorrect="off" enterkeyhint="search" maxlength="40" aria-label="Name to check"><span class="suf">.naka</span></label>
    <button type="submit">Check</button>
  </form>
  <div class="examples" role="group" aria-label="Example names">${EXAMPLES.map((c) => `<button type="button" data-q="${c}" aria-label="Check ${c}">${c}</button>`).join('')}</div>
  <div id="res" aria-live="polite"></div>
  <section class="eco" aria-label="Shielded ecosystem">
    ${ext(VAULT, 'Open Shielded Vault', 'vault')}
    <nav class="eco-links" aria-label="Official links">
      ${ext(DROPZ, 'Ord Dropz')}
      ${ext(DEVS, 'Shielded Developers')}
      ${ext(PROTOCOL, 'Shielded Protocol')}
    </nav>
  </section>
  <h2>Public registry</h2>
  <p class="dim" style="margin:0 0 8px;font-size:13px">${esc(verifiedNote)}</p>
  <div class="stats">
    ${DATA.verified ? `
    <div class="stat"><b>${s.total}</b><span>registered names</span></div>
    <div class="stat"><b>${s.perEnding.naka ?? 0}</b><span>.naka</span></div>
    <div class="stat"><b>${s.perEnding.shield ?? 0}</b><span>.shield</span></div>
    <div class="stat"><b>${takenThree}<small class="dim" style="font-size:12px">/1000</small></b><span>3-digit registered</span></div>` : `
    <div class="stat"><b>${Number.isFinite(reported) ? reported : '—'}</b><span>reported by the public index</span></div>
    <div class="stat"><b>${s.total}</b><span>loaded on this server</span></div>`}
  </div>
  ${DATA.verified ? `
  <h2>Label length</h2>
  <div class="card"><div class="bars">${lens.map(([k, v]) => `<div style="height:${Math.max(4, (v / max) * 100)}%" title="${v} names of length ${k}"><s>${v}</s><i>${k}</i></div>`).join('') || '<p class="dim">No names loaded.</p>'}</div><div style="height:16px"></div></div>
  <h2>Recent public registrations</h2>
  ${recent.length ? `<div class="recent">${recent.map((n) => `<a href="/${esc(n.name)}">${nameHtml(n.name)}</a>`).join('')}</div>` : '<div class="empty">No public registrations loaded yet.</div>'}
  <h2>000–999</h2>
  <div class="card">
    <div class="grid3">${s.three.map((t, i) => { const l = String(i).padStart(3, '0'); return t ? `<a class="t" href="/${esc(t)}" title="${esc(t)} — registered"></a>` : `<a href="/?q=${l}" title="${l} — not in the registry"></a>`; }).join('')}</div>
    <div class="legend"><span><i style="background:#7e4fc4"></i>registered (${takenThree})</span><span><i style="background:#1b1d1f"></i>not in the registry (${1000 - takenThree})</span><span>Select a square to open it</span></div>
  </div>` : '<div class="empty">The length chart, recent registrations, and 000–999 map stay hidden until the name list verifies. An empty list is not a list of available names.</div>'}
  ${secureSection()}
  ${aboutSection()}`;
  const f = $('#f'), inp = $('#q');
  f.onsubmit = (e) => { e.preventDefault(); run(inp.value); };
  document.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { inp.value = b.dataset.q; inp.focus(); run(b.dataset.q); });
  if (q) run(q);
}

function secureSection() {
  const reg = DATA.registration;
  let price;
  if (!reg) {
    price = `<div class="flag"><b>Price not confirmed.</b> This page could not read a current quote from the Shielded Vault registration service. Do not use a remembered price. Open the vault and use “See the price” before you pay.</div>`;
  } else if (!reg.enabled) {
    price = `<p>The Shielded Vault registration service reports that <b>Get a name</b> is not open right now. A shielded address still works. The protocol still accepts a valid name inscription.</p>`;
  } else {
    const network = Number.isFinite(reg.networkSats)
      ? `, plus a Bitcoin network fee of about <b>${fmtSats(reg.networkSats)}</b>`
      : '';
    const when = reg.checkedAt ? new Date(reg.checkedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
    price = `<p>The Shielded Vault registration service currently quotes a name fee of <b>${fmtSats(reg.feeSats)}</b>${network}. Postage that stays with the name is added in the vault and is not part of this public quote.</p>
      <p class="dim">The vault shows the full total before anything is signed. This quote can change${when ? ` (read ${esc(when)})` : ''}. Confirm it in the vault.</p>`;
  }
  return `<section class="card prose" aria-labelledby="secure-title">
    <h2 id="secure-title">Secure your .naka name</h2>
    <p>A .naka name is a public Bitcoin inscription that points at a shielded address. Registration through Ord Dropz happens in the Shielded Vault, using <b>Get a name</b>. You can also inscribe the record yourself. SHORD v1 sets no protocol fee and does not require a platform signature.</p>
    <h3>Where</h3>
    <p>In the ${ext(VAULT, 'Shielded Vault')}. That is the direct registration page.</p>
    <h3>How to begin</h3>
    <ol>
      <li>Check the label on this page.</li>
      <li>Open the Shielded Vault and unlock the vault the name should point at.</li>
      <li>Choose <b>Get a name</b>. The vault checks the name and shows the price before you sign.</li>
      <li>You pay from that vault’s bitcoin. The name counts once the inscription is in a block.</li>
    </ol>
    <h3>Requirements</h3>
    <ul>
      <li>The label is 3–20 characters: a–z, 0–9, and single dashes between characters. Not at the ends, and not doubled.</li>
      <li>The ending is <span class="mono">.naka</span> or <span class="mono">.shield</span>, written in lowercase.</li>
      <li>One label is one record. Registering either ending blocks the other.</li>
      <li>The inscription is <span class="mono">application/json</span> or <span class="mono">text/plain</span>, at most 400 bytes, in this shape:</li>
    </ul>
    <pre class="record">{
  "p": "shord",
  "op": "name",
  "name": "yourname.naka",
  "to": "shord1…"
}</pre>
    <ul>
      <li><span class="mono">to</span> is a shielded address (<span class="mono">shord1</span> and 128 hex characters). Selling the inscription does not change it.</li>
      <li>Reserved labels, including admin, shielded, satoshi, and naka, cannot be registered.</li>
      <li>Names count from Bitcoin block 969800. The earliest valid inscription of a label is the one the registry keeps.</li>
      <li>A name does not prove who holds the vault, and it does not reveal what the vault holds.</li>
    </ul>
    <p class="dim">Rules: ${ext(NAMES_SRC, 'src/v1/names.mjs')} and ${ext(API_DOC, 'the names API')}.</p>
    <h3>Pricing</h3>
    ${price}
    <p>${ext(VAULT, 'Open Shielded Vault', 'vault')}</p>
  </section>`;
}

function aboutSection() {
  return `<section class="card prose" aria-labelledby="about-title">
    <h2 id="about-title">Built on Shielded</h2>
    <p>Shielded Ordinals is a Bitcoin protocol. The art of a piece is public. Who holds the piece is not published as an owner. Holds are notes in a Merkle tree, and a send carries a zero-knowledge proof. That is about pieces, not about names.</p>
    <p>A <b>.naka</b> or <b>.shield</b> name is public metadata on Bitcoin. It is an inscription that points at a shielded address, so someone can send to a name instead of a long <span class="mono">shord1…</span> address. The protocol treats names as metadata: accepting a mint or a transfer does not depend on them.</p>
    <p>This directory reads that public index. It shows the name, the address it points at, the inscription, and the block. It does not show vault contents, and a name does not prove who controls the vault.</p>
    <p>Names are counted from block 969800. Two indexers at the same block with the same digest have the same names. You can replay them from a Bitcoin node with the open-source indexer, or read the hosted API from Ord Dropz. The first collection on the protocol is <a href="${esc(COLLECTION)}" target="_blank" rel="noopener noreferrer">Shielded Nakas</a>.</p>
    <p class="dim">${ext(DEVS, 'Shielded Developers')} · ${ext(PROTOCOL, 'Shielded Protocol')}</p>
  </section>`;
}

async function run(q) {
  q = q.trim();
  const res = $('#res');
  if (!res) return;
  const seq = ++checkSeq;
  history.replaceState(null, '', q ? `/?q=${encodeURIComponent(q)}` : '/');
  if (!q) { res.innerHTML = ''; return; }
  res.innerHTML = `<div class="result" aria-busy="true"><p class="loading"><span class="spin" aria-hidden="true"></span> Checking the public registry…</p></div>`;
  try {
    const r = await fetch(`/api/check?q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error('The checker did not answer');
    const body = await r.json();
    if (seq !== checkSeq) return;
    res.innerHTML = renderCheck(body);
  } catch (e) {
    if (seq !== checkSeq) return;
    res.innerHTML = `<div class="result unverified"><p class="verdict">Unverified</p><p class="sub">${esc(e.message)}. This is not a registration result.</p></div>`;
  }
}

function renderCheck(r) {
  if (r.status === 'invalid') {
    return `<div class="result invalid"><p class="verdict">Not a valid name</p><p class="sub">${esc(r.reason)}</p><p class="dim" style="font-size:13px">A label is 3–20 characters: a–z, 0–9, and single dashes between characters. The ending is .naka or .shield.</p></div>`;
  }
  if (r.status === 'reserved') {
    return `<div class="result reserved"><p class="verdict">Reserved</p><p class="sub"><b>${esc(r.label)}</b> is on the protocol reserved list. It cannot be registered under .naka or .shield.</p><p class="dim" style="font-size:13px">${esc(r.reason)}</p></div>`;
  }
  if (r.status === 'pending') {
    return `<div class="result pending"><p class="verdict">Pending</p><p class="sub"><b>${nameHtml(r.name)}</b> has a payment waiting on a Bitcoin block. It is not registered until that inscription is in the public registry.</p></div>`;
  }
  if (r.status === 'taken') {
    const h = r.holder;
    const lead = !r.verified
      ? `A cached record lists <b>${nameHtml(h.name)}</b>, but the registry digest is not verified. Do not treat this as confirmed.`
      : r.askedOtherEnding
        ? `You asked for <b>${nameHtml(r.asked)}</b>. The label <b>${esc(r.label)}</b> is already registered as <b>${nameHtml(h.name)}</b>. One label resolves once, under either ending.`
        : `<b>${nameHtml(h.name)}</b> is in the public registry.`;
    const verdict = r.verified ? 'Registered' : 'Unverified';
    const klass = r.verified ? 'taken' : 'unverified';
    return `<div class="result ${klass}"><p class="verdict">${verdict}</p><p class="sub">${lead}</p>
      <div class="pills"><span class="pill">${nameHtml(h.name)}</span>${r.blocked.map((b) => `<span class="pill x">${esc(b)}</span>`).join('')}</div>
      <dl class="kv">
        <dt>Name</dt><dd><a href="/${esc(h.name)}">${nameHtml(h.name)}</a><button type="button" class="copy" data-copy="${esc(h.name)}" data-kind="name">Copy name</button></dd>
        <dt>Registered</dt><dd><a href="${blockUrl(h.height)}" target="_blank" rel="noopener noreferrer">block ${h.height}</a>${h.time ? `<span class="dim">${fmtDate(h.time)}</span>` : ''}</dd>
        <dt>Inscription</dt><dd><a href="${insc(h.id)}" target="_blank" rel="noopener noreferrer">${esc(h.id.slice(0, 10))}…${esc(h.id.slice(-4))}</a></dd>
        <dt>Points at</dt><dd><a class="addr" href="/${esc(h.to)}">${short(h.to)}</a><button type="button" class="copy" data-copy="${esc(h.to)}" data-kind="address">Copy address</button></dd>
      </dl></div>`;
  }
  const unregistered = r.verified && r.mintAgrees === true && !r.mintConflict;
  if (unregistered) {
    const opts = r.options.map((o) => `<span class="pill">${esc(o)}</span>`).join(' ');
    return `<div class="result free"><p class="verdict">Unregistered</p>
      <p class="sub"><b>${esc(r.label)}</b> is not in the public registry as of block ${r.height ?? '?'}. The registration service also reports it as available. That is a snapshot, not a reservation. The first confirmed inscription is the one the registry keeps. Choosing one ending locks the other.</p>
      <div class="pills">${opts}</div>
      <p class="note">Register it with ${ext(VAULT, 'Get a name in the Shielded Vault')}, or inscribe the record yourself. “Unregistered” here means it was absent from the verified index at that block.</p></div>`;
  }
  const why = r.mintConflict
    ? 'The registration service reports a record that this index does not list yet.'
    : !r.verified
      ? 'The registry digest is not verified on this load.'
      : 'The registration service did not confirm that the name is available.';
  return `<div class="result unverified"><p class="verdict">Unverified</p>
    <p class="sub"><b>${esc(r.label || r.input)}</b> is not confirmed. ${esc(why)} This is not a statement that the name is available.</p>
    <p class="note">Check again after the next indexed block, or confirm in the ${ext(VAULT, 'Shielded Vault')} before you pay.</p></div>`;
}

function withRank() {
  const L = DATA.names.map((n, k) => ({ ...n, i: n.i ?? k }));
  if (L.every((n) => n.rank)) return L;
  [...L].sort((a, b) => a.height - b.height || a.i - b.i).forEach((n, k) => { n.rank = k + 1; });
  return L;
}
const F = { q: '', end: 'all', len: 'all', kind: 'all', sort: 'first' };
const SORTS = ['first', 'last', 'az', 'short'];
const VIEWS = [['first', 'First registered'], ['newest', 'Newest'], ['naka', '.naka only'], ['shield', '.shield only']];
const VIEW_SET = { first: { end: 'all', sort: 'first' }, newest: { end: 'all', sort: 'last' }, naka: { end: 'naka', sort: 'first' }, shield: { end: 'shield', sort: 'first' } };
const viewOf = () => F.end === 'naka' || F.end === 'shield' ? (F.sort === 'first' ? F.end : null) : F.sort === 'first' ? 'first' : F.sort === 'last' ? 'newest' : null;
function syncSeg() {
  const v = viewOf();
  document.querySelectorAll('#seg [data-view]').forEach((b) => {
    const on = b.dataset.view === v;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
const SORT_ALIAS = { old: 'first', oldest: 'first', new: 'last', newest: 'last' };
function directory() {
  nav('/names');
  const sp = new URLSearchParams(location.search);
  for (const k of Object.keys(F)) if (sp.get(k)) F[k] = sp.get(k);
  F.sort = SORT_ALIAS[F.sort] ?? F.sort;
  if (!SORTS.includes(F.sort)) F.sort = 'first';
  const lens = [...new Set(DATA.names.map((n) => n.label.length))].sort((a, b) => a - b);
  app.innerHTML = `
  <header class="hero">
    <h1>Directory</h1>
    <p class="kicker">NAMES.NAKA</p>
    <p class="tagline">Registered names, from the public index.</p>
  </header>
  <p class="lede">Every public .naka and .shield name this server has indexed. <b>#1</b> was registered first. Search updates as you type.${DATA.verified ? '' : ' This copy of the list is not verified, so an empty result is not proof that a name is available.'}</p>
  <div class="seg" id="seg" role="group" aria-label="Directory view">${VIEWS.map(([v, t]) => `<button type="button" data-view="${v}" aria-pressed="false">${t}</button>`).join('')}</div>
  <div class="filters">
    <input id="fq" type="search" placeholder="Search names" value="${esc(F.q)}" aria-label="Search registered names" autocapitalize="none" spellcheck="false" enterkeyhint="search">
    <select id="fe" aria-label="Ending"><option value="all">All endings</option><option value="naka">.naka</option><option value="shield">.shield</option></select>
    <select id="fl" aria-label="Length"><option value="all">Any length</option>${lens.map((l) => `<option value="${l}">${l} characters</option>`).join('')}</select>
    <select id="fk" aria-label="Kind"><option value="all">Any characters</option><option value="digits">Digits only</option><option value="letters">Letters only</option><option value="mixed">Mixed</option></select>
    <select id="fs" aria-label="Sort"><option value="first">First registered</option><option value="last">Latest registered</option><option value="az">A to Z</option><option value="short">Shortest</option></select>
  </div>
  <div class="count" id="cnt" aria-live="polite"></div>
  <div class="table-wrap">
  <table><caption class="sr">Registered names</caption><thead><tr><th class="rk" title="Registration rank. #1 is the earliest.">#</th><th>Name</th><th>Block</th><th class="hide-m">Inscription</th><th>Points at</th></tr></thead><tbody id="rows"></tbody></table>
  </div>
  <h2>Reverse lookup</h2>
  <p class="dim" style="margin:0;font-size:14px">Paste a shielded address (shord1…) to see which public names point at it. This does not show what the vault holds.</p>
  <form class="rev" id="rf"><input id="ra" placeholder="shord1…" spellcheck="false" autocapitalize="none" aria-label="Shielded address"><button type="submit">Look up</button></form>
  <div id="rres" aria-live="polite"></div>`;
  $('#fe').value = F.end; $('#fl').value = F.len; $('#fk').value = F.kind; $('#fs').value = F.sort;
  const upd = () => {
    F.q = $('#fq').value.trim().toLowerCase();
    F.end = $('#fe').value;
    F.len = $('#fl').value;
    F.kind = $('#fk').value;
    F.sort = $('#fs').value;
    draw();
    const u = new URLSearchParams(Object.entries(F).filter(([k, v]) => v && v !== 'all' && !(k === 'sort' && v === 'first')));
    history.replaceState(null, '', `/names${u.size ? '?' + u : ''}`);
  };
  ['#fq', '#fe', '#fl', '#fk', '#fs'].forEach((s) => $(s).addEventListener('input', upd));
  document.querySelectorAll('#seg [data-view]').forEach((b) => b.onclick = () => {
    const v = VIEW_SET[b.dataset.view];
    $('#fe').value = v.end;
    $('#fs').value = v.sort;
    upd();
  });
  $('#rf').onsubmit = (e) => {
    e.preventDefault();
    const a = $('#ra').value.trim().toLowerCase();
    if (/^shord1[0-9a-f]{128}$/.test(a)) go(`/${a}`);
    else $('#rres').innerHTML = `<div class="result invalid" style="margin-top:10px"><p class="sub" style="margin:0">That is not a shielded address. A shielded address starts with <b>shord1</b> and has 128 hex characters after it.</p></div>`;
  };
  draw();
}
function draw() {
  let L = withRank();
  if (F.q) L = L.filter((n) => n.name.includes(F.q) || n.label.includes(F.q));
  if (F.end !== 'all') L = L.filter((n) => n.ending === F.end);
  if (F.len !== 'all') L = L.filter((n) => n.label.length === Number(F.len));
  if (F.kind === 'digits') L = L.filter((n) => /^\d+$/.test(n.label));
  if (F.kind === 'letters') L = L.filter((n) => /^[a-z]+$/.test(n.label));
  if (F.kind === 'mixed') L = L.filter((n) => !/^\d+$/.test(n.label) && !/^[a-z]+$/.test(n.label));
  const s = {
    first: (a, b) => a.rank - b.rank,
    last: (a, b) => b.rank - a.rank,
    az: (a, b) => a.name.localeCompare(b.name),
    short: (a, b) => a.label.length - b.label.length || a.name.localeCompare(b.name),
  }[F.sort] ?? ((a, b) => a.rank - b.rank);
  L.sort(s);
  syncSeg();
  const noun = L.length === 1 ? 'name' : 'names';
  $('#cnt').textContent = `${L.length} ${noun} of ${DATA.names.length}`;
  const checkLink = F.q
    ? ` <a href="/?q=${encodeURIComponent(F.q)}">Check “${esc(F.q)}” in the name checker.</a>`
    : '';
  $('#rows').innerHTML = L.length ? L.map((n) => `<tr>
    <td class="rk" data-label="Rank">#${n.rank}</td>
    <td class="nm" data-label="Name"><a href="/${esc(n.name)}">${nameHtml(n.name)}</a> <button type="button" class="copy" data-copy="${esc(n.name)}" data-kind="name">Copy</button></td>
    <td data-label="Block"><a href="${blockUrl(n.height)}" target="_blank" rel="noopener noreferrer" title="${esc(fmtDate(n.time) ?? '')}">${n.height}</a></td>
    <td class="hide-m" data-label="Inscription"><a href="${insc(n.id)}" target="_blank" rel="noopener noreferrer">${esc(n.id.slice(0, 8))}…</a></td>
    <td data-label="Points at"><button type="button" class="copy" data-copy="${esc(n.to)}" data-kind="address" title="${esc(n.to)}"><span class="hide-m">${esc(n.to.slice(6, 12))}</span>…${esc(n.to.slice(-4))}</button></td></tr>`).join('')
    : `<tr><td colspan="5"><div class="empty">No registered names match this search.${checkLink} A missing row is not proof that a name is available.</div></td></tr>`;
}

async function namePage(seg) {
  nav('');
  const r = await fetch(`/api/name/${encodeURIComponent(seg)}`);
  if (r.status !== 200) {
    const j = await r.json().catch(() => ({}));
    app.innerHTML = `<p><a href="/names" data-link>Back to the directory</a></p><div class="big">${/^[a-z0-9.-]+$/.test(seg) && seg.includes('.') ? nameHtml(seg) : esc(seg)}</div>${j.check ? renderCheck(j.check) : '<div class="empty">No public record for this name.</div>'}`;
    return;
  }
  const n = await r.json();
  const others = n.ending === 'naka' ? `${n.label}.shield` : `${n.label}.naka`;
  const rk = n.rank ?? withRank().find((x) => x.name === n.name)?.rank;
  const same = DATA.names.filter((x) => x.to === n.to && x.name !== n.name);
  document.title = `${n.name} — NAMES.NAKA`;
  app.innerHTML = `<p><a href="/names" data-link>Back to the directory</a></p>
  <p class="dim" style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Registered <b class="rank">#${rk ?? '?'}</b> of ${DATA.names.length}${DATA.verified ? '' : ' · digest not verified'}</p>
  <div class="big">${nameHtml(n.name)}</div>
  <p class="dim" style="margin:0">Registered at block ${n.height}${n.time ? ` · ${fmtDate(n.time)}` : ''}. <span class="pill x">${esc(others)}</span> is locked with it.</p>
  <div class="card">
    <dl class="kv" style="margin:0">
      <dt>Points at</dt><dd><span class="addr">${esc(n.to)}</span></dd>
      <dt>Copy</dt><dd><button type="button" class="copy" data-copy="${esc(n.to)}" data-kind="address">Copy address</button><button type="button" class="copy" data-copy="${esc(n.name)}" data-kind="name">Copy name</button><a class="copy btn ghost" href="/${esc(n.to)}">Names for this address</a></dd>
      <dt>Block</dt><dd><a href="${blockUrl(n.height)}" target="_blank" rel="noopener noreferrer">${n.height}</a></dd>
      <dt>Inscription</dt><dd><a href="${insc(n.id)}" target="_blank" rel="noopener noreferrer">${esc(n.id)}</a></dd>
    </dl>
  </div>
  ${same.length ? `<h2>Also points here</h2><div class="recent">${same.map((x) => `<a href="/${esc(x.name)}">${nameHtml(x.name)}</a>`).join('')}</div>` : ''}
  <p class="note">To send a shielded piece here, type <b>${esc(n.name)}</b> in the Shielded Vault send box. A name is a public signpost. It does not prove who holds the vault, and the inscription cannot be edited to point somewhere else.</p>`;
}

async function addressPage(a) {
  nav('');
  document.title = 'Shielded address — NAMES.NAKA';
  const j = await (await fetch(`/api/of/${a}`)).json();
  const names = j.names ?? [];
  app.innerHTML = `<p><a href="/names" data-link>Back to the directory</a></p>
  <p class="dim" style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Shielded address</p>
  <div class="card"><span class="addr">${esc(a)}</span> <button type="button" class="copy" data-copy="${esc(a)}" data-kind="address">Copy address</button></div>
  <h2>${names.length ? `${names.length} public name${names.length > 1 ? 's' : ''} point here` : 'No public names'}</h2>
  ${names.length ? `<div class="recent">${names.map((x) => `<a href="/${esc(x.name)}">${nameHtml(x.name)}</a>`).join('')}</div>` : '<div class="empty">No public name record points at this address. What the vault holds stays private.</div>'}
  <p class="note">What a vault holds is private. This page only lists public name records that point at this address.</p>`;
}

route().catch((e) => { app.innerHTML = `<div class="empty">The registry did not load. ${esc(e.message)}</div>`; });
