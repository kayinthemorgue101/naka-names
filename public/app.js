// .naka registry — client. Talks only to this server's /api/*. No keys here.
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (a) => a ? `${a.slice(0, 10)}…${a.slice(-6)}` : '';
const insc = (id) => `https://ordinals.com/inscription/${id}`;
const blockUrl = (h) => `https://mempool.space/block/${h}`;
const fmtDate = (t) => t ? new Date(t * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
const nameHtml = (full) => { const [l, e] = full.split('.'); return `${esc(l)}<span class="${e === 'shield' ? 'sh' : ''}">.${esc(e)}</span>`; };
let DATA = null;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1400); }
async function copy(text) { try { await navigator.clipboard.writeText(text); } catch { const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); } toast('Copied. Handle with care.'); }
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-copy]'); if (c) { e.preventDefault(); copy(c.dataset.copy); return; }
  const a = e.target.closest('a[data-link], a[href^="/"]');
  if (a && !a.target && a.origin === location.origin && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(a.getAttribute('href')); }
});
window.addEventListener('popstate', () => route());
function go(href) { history.pushState(null, '', href); route(); window.scrollTo(0, 0); }

async function load(force) {
  if (DATA && !force) return DATA;
  const r = await fetch('/api/names'); DATA = await r.json();
  const h = DATA.info?.height;
  $('#sync').innerHTML = `${DATA.stats.total} names · indexed to block <a href="${blockUrl(h)}" target="_blank" rel="noopener">${h ?? '?'}</a> · ${DATA.verified ? '<span style="color:var(--lime)">digest verified ✓</span>' : '<span style="color:var(--amber)">digest unverified</span>'}`;
  return DATA;
}
setInterval(() => load(true).catch(() => {}), 60_000);

function nav(which) { document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === which)); }

async function route() {
  const p = decodeURIComponent(location.pathname).replace(/\/+$/, '') || '/';
  await load();
  if (p === '/') return home();
  if (p === '/names') return directory();
  const seg = p.slice(1).toLowerCase();
  if (/^shord1[0-9a-f]{128}$/.test(seg)) return addressPage(seg);
  return namePage(seg);
}

// ---------- check ----------
const CHIPS = ['kayy', 'obi', 'satoshi', 'a', 'mortician', 'embalm', 'grave'];
function home() {
  nav('/');
  const s = DATA.stats, q = new URLSearchParams(location.search).get('q') ?? '';
  const lens = Object.entries(s.lengths).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]);
  const max = Math.max(...lens.map((x) => x[1]));
  const takenThree = s.three.filter(Boolean).length;
  const recent = [...DATA.names].reverse().slice(0, 12);
  app.innerHTML = `
  <h1>Claim a name<br>before <em>someone else</em> does.</h1>
  <p class="lede">Check any <b>.naka</b> / <b>.shield</b> label against every name on Bitcoin. First inscription wins, forever. There is no expiry and no appeal.</p>
  <form class="check" id="f" autocomplete="off">
    <label class="inwrap"><input id="q" name="q" placeholder="yourname(.naka)" value="${esc(q)}" spellcheck="false" autocapitalize="none" autocorrect="off" enterkeyhint="search" maxlength="40" aria-label="Name to check"><span class="suf">.naka / .shield</span></label>
    <button>Check</button>
  </form>
  <div class="chips">${CHIPS.map((c) => `<button type="button" data-q="${c}">${c}</button>`).join('')}</div>
  <div id="res" aria-live="polite"></div>
  <div class="stats">
    <div class="stat"><b>${s.total}</b><span>names claimed</span></div>
    <div class="stat"><b>${s.perEnding.naka ?? 0}</b><span>.naka</span></div>
    <div class="stat"><b>${s.perEnding.shield ?? 0}</b><span>.shield</span></div>
    <div class="stat"><b>${takenThree}<small class="dim" style="font-size:12px">/1000</small></b><span>3-digit taken</span></div>
  </div>
  <h2>Label length</h2>
  <div class="card"><div class="bars">${lens.map(([k, v]) => `<div style="height:${Math.max(4, (v / max) * 100)}%" title="${v} names of length ${k}"><s>${v}</s><i>${k}</i></div>`).join('')}</div><div style="height:16px"></div></div>
  <h2>Fresh plots</h2>
  <div class="recent">${recent.map((n) => `<a href="/${esc(n.name)}">${nameHtml(n.name)}</a>`).join('')}</div>
  <h2>The 000–999 cemetery</h2>
  <div class="card">
    <div class="grid3">${s.three.map((t, i) => { const l = String(i).padStart(3, '0'); return t ? `<a class="t" href="/${t}" title="${t} — taken"></a>` : `<a href="/?q=${l}" title="${l} — free"></a>`; }).join('')}</div>
    <div class="legend"><span><i style="background:var(--pink)"></i>taken (${takenThree})</span><span><i style="background:#1b1b24"></i>free (${1000 - takenThree})</span><span>tap a square</span></div>
  </div>`;
  const f = $('#f'), inp = $('#q');
  f.onsubmit = (e) => { e.preventDefault(); run(inp.value); };
  document.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { inp.value = b.dataset.q; run(b.dataset.q); });
  if (q) run(q);
}

async function run(q) {
  q = q.trim(); const res = $('#res'); if (!res) return;
  history.replaceState(null, '', q ? `/?q=${encodeURIComponent(q)}` : '/');
  if (!q) { res.innerHTML = ''; return; }
  res.innerHTML = `<div class="result"><p class="dim">Checking the register…</p></div>`;
  const r = await (await fetch(`/api/check?q=${encodeURIComponent(q)}`)).json();
  res.innerHTML = renderCheck(r);
}

function renderCheck(r) {
  if (r.status === 'invalid') return `<div class="result invalid"><p class="verdict">Not a name</p><p class="sub">${esc(r.reason)}</p><p class="dim" style="font-size:12.5px">Rules: 3–20 characters · a–z, 0–9, single dashes between characters · ends in .naka or .shield.</p></div>`;
  if (r.status === 'reserved') return `<div class="result reserved"><p class="verdict">Reserved</p><p class="sub"><b>${esc(r.label)}</b> is on the house list. Nobody gets it under either ending, not even with flowers.</p><p class="dim" style="font-size:12.5px">${esc(r.reason)}</p></div>`;
  if (r.status === 'pending') return `<div class="result pending"><p class="verdict">Pending</p><p class="sub"><b>${nameHtml(r.name)}</b> is paid for and waiting on a block. Body’s on the table; paperwork is processing.</p></div>`;
  if (r.status === 'taken') {
    const h = r.holder;
    const lead = r.askedOtherEnding
      ? `You asked for <b>${nameHtml(r.asked)}</b>, but the label <b>${esc(r.label)}</b> already belongs to <b>${nameHtml(h.name)}</b>. One label, one owner, across both endings.`
      : `Already claimed, forever. No exhumation.`;
    return `<div class="result taken"><p class="verdict">Taken</p><p class="sub">${lead}</p>
      <div class="chips" style="margin:0 0 6px"><span class="pill" style="border-color:#ff2e8866;color:var(--text)">${nameHtml(h.name)} ✓ holds it</span>${r.blocked.map((b) => `<span class="pill x">${esc(b)}</span>`).join('')}</div>
      <dl class="kv">
        <dt>Name</dt><dd><a href="/${esc(h.name)}">${nameHtml(h.name)}</a></dd>
        <dt>Claimed</dt><dd><a href="${blockUrl(h.height)}" target="_blank" rel="noopener">block ${h.height}</a>${h.time ? `<span class="dim">${fmtDate(h.time)}</span>` : ''}</dd>
        <dt>Inscription</dt><dd><a href="${insc(h.id)}" target="_blank" rel="noopener">${esc(h.id.slice(0, 10))}…${esc(h.id.slice(-4))} ↗</a></dd>
        <dt>Points at</dt><dd><a class="addr" href="/${esc(h.to)}">${short(h.to)}</a><button class="copy" data-copy="${esc(h.to)}">copy</button></dd>
      </dl></div>`;
  }
  const opts = r.options.map((o) => `<span class="pill ok">${esc(o)}</span>`).join(' ');
  return `<div class="result free"><p class="verdict">Free</p><p class="sub"><b>${esc(r.label)}</b> is unclaimed as of block ${r.height ?? '?'}. Vacancy in the plot. Pick one ending; the other gets locked with it.</p>
    <div class="chips" style="margin:0">${opts}</div>
    <p class="note">Register it in the <a href="https://ord-dropz.xyz/wallet" target="_blank" rel="noopener">Shielded Vault</a> (“Get a name”), or inscribe the record yourself. Whoever's inscription lands first wins, so “free” here is a snapshot, not a reservation.${r.mintAgrees === true ? ' The mint server agrees.' : ''}</p></div>`;
}

// ---------- directory ----------
const F = { q: '', end: 'all', len: 'all', kind: 'all', sort: 'new' };
function directory() {
  nav('/names');
  const sp = new URLSearchParams(location.search); for (const k of Object.keys(F)) if (sp.get(k)) F[k] = sp.get(k);
  const lens = [...new Set(DATA.names.map((n) => n.label.length))].sort((a, b) => a - b);
  app.innerHTML = `
  <h1>The <em>register</em></h1>
  <p class="lede">Every shielded name, in the order Bitcoin buried them.</p>
  <div class="filters">
    <input id="fq" type="search" placeholder="search names…" value="${esc(F.q)}" aria-label="Search" autocapitalize="none" spellcheck="false">
    <select id="fe" aria-label="Ending"><option value="all">all endings</option><option value="naka">.naka</option><option value="shield">.shield</option></select>
    <select id="fl" aria-label="Length"><option value="all">any length</option>${lens.map((l) => `<option value="${l}">${l} chars</option>`).join('')}</select>
    <select id="fk" aria-label="Kind"><option value="all">any chars</option><option value="digits">digits only</option><option value="letters">letters only</option><option value="mixed">mixed</option></select>
    <select id="fs" aria-label="Sort"><option value="new">newest</option><option value="old">oldest</option><option value="az">a → z</option><option value="short">shortest</option></select>
  </div>
  <div class="count" id="cnt"></div>
  <table><thead><tr><th>Name</th><th>Block</th><th class="hide-m">Inscription</th><th>Points at</th></tr></thead><tbody id="rows"></tbody></table>
  <h2>Reverse lookup</h2>
  <p class="dim" style="margin:0;font-size:13px">Paste a shielded address (shord1…) to see which names point at it.</p>
  <form class="rev" id="rf"><input id="ra" placeholder="shord1…" spellcheck="false" autocapitalize="none" aria-label="Shielded address"><button>Look up</button></form>
  <div id="rres"></div>`;
  $('#fe').value = F.end; $('#fl').value = F.len; $('#fk').value = F.kind; $('#fs').value = F.sort;
  const upd = () => { F.q = $('#fq').value.trim().toLowerCase(); F.end = $('#fe').value; F.len = $('#fl').value; F.kind = $('#fk').value; F.sort = $('#fs').value; draw(); const u = new URLSearchParams(Object.entries(F).filter(([k, v]) => v && v !== 'all' && !(k === 'sort' && v === 'new'))); history.replaceState(null, '', `/names${u.size ? '?' + u : ''}`); };
  ['#fq', '#fe', '#fl', '#fk', '#fs'].forEach((s) => $(s).addEventListener('input', upd));
  $('#rf').onsubmit = (e) => { e.preventDefault(); const a = $('#ra').value.trim().toLowerCase(); if (/^shord1[0-9a-f]{128}$/.test(a)) go(`/${a}`); else $('#rres').innerHTML = `<div class="result invalid" style="margin-top:10px"><p class="sub" style="margin:0">That's not a shielded address. Those start with <b>shord1</b> and run 128 hex characters after it.</p></div>`; };
  draw();
}
function draw() {
  let L = DATA.names.map((n, i) => ({ ...n, i }));
  if (F.q) L = L.filter((n) => n.name.includes(F.q));
  if (F.end !== 'all') L = L.filter((n) => n.ending === F.end);
  if (F.len !== 'all') L = L.filter((n) => n.label.length === Number(F.len));
  if (F.kind === 'digits') L = L.filter((n) => /^\d+$/.test(n.label));
  if (F.kind === 'letters') L = L.filter((n) => /^[a-z]+$/.test(n.label));
  if (F.kind === 'mixed') L = L.filter((n) => !/^\d+$/.test(n.label) && !/^[a-z]+$/.test(n.label));
  const s = { new: (a, b) => b.i - a.i, old: (a, b) => a.i - b.i, az: (a, b) => a.name.localeCompare(b.name), short: (a, b) => a.label.length - b.label.length || a.name.localeCompare(b.name) }[F.sort];
  L.sort(s);
  $('#cnt').textContent = `${L.length} of ${DATA.names.length} names`;
  const free = F.q && /^[a-z0-9-]{3,20}$/.test(F.q.replace(/\.(naka|shield)$/, '')) && !DATA.names.some((n) => n.label === F.q.replace(/\.(naka|shield)$/, ''));
  $('#rows').innerHTML = L.length ? L.map((n) => `<tr>
    <td class="nm"><a href="/${esc(n.name)}">${nameHtml(n.name)}</a></td>
    <td><a href="${blockUrl(n.height)}" target="_blank" rel="noopener" title="${esc(fmtDate(n.time) ?? '')}">${n.height}</a></td>
    <td class="hide-m"><a href="${insc(n.id)}" target="_blank" rel="noopener">${esc(n.id.slice(0, 8))}… ↗</a></td>
    <td><button class="copy" data-copy="${esc(n.to)}" title="${esc(n.to)}">${esc(n.to.slice(6, 12))}…${esc(n.to.slice(-4))} ⧉</button></td></tr>`).join('')
    : `<tr><td colspan="4"><div class="empty">No bodies here.${free ? ` <a href="/?q=${encodeURIComponent(F.q)}">“${esc(F.q)}” looks free — check it →</a>` : ''}</div></td></tr>`;
}

// ---------- name & address pages ----------
async function namePage(seg) {
  nav('');
  const r = await fetch(`/api/name/${encodeURIComponent(seg)}`);
  if (r.status !== 200) {
    const j = await r.json().catch(() => ({}));
    app.innerHTML = `<p><a href="/names">← register</a></p><div class="big">${/^[a-z0-9.-]+$/.test(seg) && seg.includes('.') ? nameHtml(seg) : esc(seg)}</div>${j.check ? renderCheck(j.check) : '<div class="empty">Nothing buried here.</div>'}`;
    return;
  }
  const n = await r.json();
  const others = n.ending === 'naka' ? `${n.label}.shield` : `${n.label}.naka`;
  const idx = DATA.names.findIndex((x) => x.name === n.name);
  const same = DATA.names.filter((x) => x.to === n.to && x.name !== n.name);
  app.innerHTML = `<p><a href="/names">← register</a></p>
  <p class="dim" style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.2em">Shielded name #${idx + 1}</p>
  <div class="big">${nameHtml(n.name)}</div>
  <p class="dim" style="margin:0">Claimed at block ${n.height}${n.time ? ` · ${fmtDate(n.time)}` : ''}. <span class="pill x">${esc(others)}</span> is locked with it.</p>
  <div class="card">
    <dl class="kv" style="margin:0">
      <dt>Points at</dt><dd><span class="addr">${esc(n.to)}</span></dd>
      <dt></dt><dd><button class="copy" data-copy="${esc(n.to)}">copy address</button><button class="copy" data-copy="${esc(n.name)}">copy name</button><a class="copy btn ghost" href="/${esc(n.to)}">all names for this vault</a></dd>
      <dt>Block</dt><dd><a href="${blockUrl(n.height)}" target="_blank" rel="noopener">${n.height} ↗</a></dd>
      <dt>Inscription</dt><dd><a href="${insc(n.id)}" target="_blank" rel="noopener">${esc(n.id)} ↗</a></dd>
    </dl>
  </div>
  ${same.length ? `<h2>Also points here</h2><div class="recent">${same.map((x) => `<a href="/${esc(x.name)}">${nameHtml(x.name)}</a>`).join('')}</div>` : ''}
  <p class="note">To send a shielded piece here, type <b>${esc(n.name)}</b> in the Shielded Vault's send box. A name is a public signpost to a vault. It doesn't prove who holds the vault, and it can never be moved, edited, or resold to point elsewhere.</p>`;
}

async function addressPage(a) {
  nav('');
  const j = await (await fetch(`/api/of/${a}`)).json();
  app.innerHTML = `<p><a href="/names">← register</a></p>
  <p class="dim" style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.2em">Shielded address</p>
  <div class="card"><span class="addr">${esc(a)}</span> <button class="copy" data-copy="${esc(a)}">copy</button></div>
  <h2>${j.names?.length ? `${j.names.length} name${j.names.length > 1 ? 's' : ''} point here` : 'No names'}</h2>
  ${j.names?.length ? `<div class="recent">${j.names.map((x) => `<a href="/${esc(x.name)}">${nameHtml(x.name)}</a>`).join('')}</div>` : `<div class="empty">Anonymous. No headstone. Which is rather the point of shielded.</div>`}
  <p class="note">What a vault holds is private; this only shows public name records pointing at it.</p>`;
}

route().catch((e) => { app.innerHTML = `<div class="empty">The index didn't answer. ${esc(e.message)}</div>`; });
