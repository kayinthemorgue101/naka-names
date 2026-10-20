// Halving watch — Bitcoin tip height vs the next halving (block 1,050,000). Talks only to /api/blocks.
const INTERVAL = 210000;
const MP = 'https://mempool.space';
const I18N = window.NAKA_I18N || { t: (_k, en) => en, onChange() {} };
const tr = I18N.t;
const fmt = (n) => Number(n).toLocaleString('en-US');
const btc = (n) => String(Number(n.toFixed(8)));
const loc = () => (I18N.lang === 'zh-CN' ? ['zh-CN'] : []);
// Derive the halving epoch from height so the page keeps working after 1,050,000 too.
function epochOf(h) {
  const n = Math.floor(h / INTERVAL);
  return { start: n * INTERVAL, next: (n + 1) * INTERVAL, now: 50 / 2 ** n, after: 50 / 2 ** (n + 1) };
}
function eta(blocks) {
  const m = blocks * 10;
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? tr('eta.d', `~${d}d ${h}h`, { d, h }) : h ? tr('eta.h', `~${h}h ${mm}m`, { h, m: mm }) : tr('eta.m', `~${mm}m`, { m: mm });
}
const etaDate = (blocks, from) => new Date((from || Date.now()) + blocks * 600_000);
const fmtDate = (d) => d.toLocaleString(loc(), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
async function getBlocks() {
  const r = await fetch('/api/blocks');
  if (!r.ok) throw new Error('blocks unavailable');
  return r.json();
}
const ago = (t) => t ? new Date(t).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }) : '—';
const bar = (e, h) => {
  const pct = Math.min(100, Math.max(0, ((h - e.start) / INTERVAL) * 100));
  return `<div class="hv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(1)}"><i style="width:${pct.toFixed(2)}%"></i></div>
  <p class="hv-bar-l"><span>${fmt(e.start)}</span><span>${tr('hv.pct', `${pct.toFixed(2)}% through this epoch`, { p: pct.toFixed(2) })}</span><span>${fmt(e.next)}</span></p>`;
};

function cardHtml(b) {
  const h = b?.height;
  if (h == null) return `<p class="sub" style="margin:0">${tr('bw.unavail', 'Block height unavailable right now. No number shown rather than a guess.')}</p>`;
  const e = epochOf(h), left = e.next - h;
  return `<div class="bw-row">
    <div><b><a href="${MP}/block-height/${h}" target="_blank" rel="noopener">${fmt(h)}</a></b><span>${tr('bw.tip', 'tip height')}${b.stale ? ` · ${tr('bw.stale', 'stale')}` : ''}</span></div>
    <div><b>${fmt(left)}</b><span>${tr('bw.to', `blocks to ${fmt(e.next)}`, { t: fmt(e.next) })}</span></div>
    <div><b>${eta(left)}</b><span>${tr('bw.est', 'est. time (~10 min/block)')}</span></div>
  </div>
  ${bar(e, h)}
  <p class="hv-sub">${tr('hv.reward', `Subsidy ${btc(e.now)} BTC → ${btc(e.after)} BTC`, { a: btc(e.now), b: btc(e.after) })}</p>`;
}

export async function blocksCard(el) {
  if (!el) return;
  const draw = async () => {
    let b = null; try { b = await getBlocks(); } catch {}
    if (!el.isConnected) return false;
    el.innerHTML = `<h2>${tr('hw.h2', '₿ Halving Watch')}</h2>
    <div class="card bw">
      ${cardHtml(b)}
      <p class="bw-links"><a href="/blocks" target="_self">${tr('bw.details', 'Details →')}</a> · <a href="${MP}" target="_blank" rel="noopener">mempool.space ↗</a> · <span class="dim">${tr('hw.caveat', 'the block reward dies again')}</span></p>
    </div>`;
    return true;
  };
  if (await draw()) { const t = setInterval(async () => { if (!(await draw())) clearInterval(t); }, 60_000); }
}

async function page(el) {
  let b = null; try { b = await getBlocks(); } catch {}
  const h = b?.height;
  const e = h == null ? epochOf(840000) : epochOf(h), left = h == null ? null : e.next - h;
  el.innerHTML = `
  <h1>${tr('hp.h1', 'Halving<br><em>Watch</em>')}</h1>
  <p class="lede">${tr('hp.lede', `Live Bitcoin block height, counting down to block <b>${fmt(e.next)}</b>, where the block reward dies again. Half of it, anyway.`, { t: fmt(e.next) })}</p>
  ${h == null ? `<div class="result invalid"><p class="verdict">${tr('bp.unavail', 'Height unavailable')}</p><p class="sub">${tr('bp.unavail.sub', 'Neither mempool.space nor blockstream.info answered. No number is shown rather than a guess.')}</p></div>` : `
  <div class="result pending">
    <p class="verdict">${tr('bp.togo', `${fmt(left)} blocks to go`, { n: fmt(left) })}</p>
    <p class="sub">${tr('hp.est', `Estimated around <b>${fmtDate(etaDate(left, b.fetchedAt))}</b> (${eta(left)}), assuming ~10 minutes per block. <b>This is an estimate</b>: real block times wander, and the date drifts with them.`, { date: fmtDate(etaDate(left, b.fetchedAt)), eta: eta(left) })}</p>
    ${bar(e, h)}
    <dl class="kv">
      <dt>${tr('bw.tip', 'Tip height')}</dt><dd><a href="${MP}/block-height/${h}" target="_blank" rel="noopener">${fmt(h)} ↗</a>${b.stale ? `<span class="pill">${tr('bw.stale', 'stale')}</span>` : ''}</dd>
      <dt>${tr('hp.at', 'Halving block')}</dt><dd>${fmt(e.next)}</dd>
      <dt>${tr('bp.remain', 'Remaining')}</dt><dd>${tr('bp.blocks', `${fmt(left)} blocks`, { n: fmt(left) })}</dd>
      <dt>${tr('hp.eta', 'Est. date (estimate)')}</dt><dd class="bw-dd">${fmtDate(etaDate(left, b.fetchedAt))}</dd>
      <dt>${tr('hp.now', 'Subsidy now')}</dt><dd>${btc(e.now)} BTC</dd>
      <dt>${tr('hp.after', 'Subsidy after')}</dt><dd>${btc(e.after)} BTC</dd>
      <dt>${tr('hp.epoch', 'Epoch')}</dt><dd class="bw-dd">${fmt(e.start)} → ${fmt(e.next)}</dd>
      <dt>${tr('bp.source', 'Source')}</dt><dd class="bw-dd">${tr('bp.checked', `${b.source ?? '—'} · checked ${ago(b.fetchedAt)}`, { src: b.source ?? '—', t: ago(b.fetchedAt) })}</dd>
    </dl>
  </div>`}
  <h2>${tr('bp.what', 'What this is')}</h2>
  <div class="card">
    <p style="margin-top:0">${tr('hp.p1', 'Every <b>210,000 blocks</b> (roughly four years) the new-coin subsidy miners get per block is cut in half. 50 → 25 → 12.5 → 6.25 → 3.125 BTC. The last cut was block <b>840,000</b> in April 2024.')}</p>
    <p>${tr('hp.p2', `At block <b>${fmt(e.next)}</b> it drops from ${btc(e.now)} to ${btc(e.after)} BTC. Nobody votes on it, nobody can stop it. The code just quietly halves the reward and carries on.`, { t: fmt(e.next), a: btc(e.now), b: btc(e.after) })}</p>
    <p style="margin-bottom:0">${tr('hp.p3', 'Transaction fees are not halved. This page only counts blocks; it is not advice about anything.')}</p>
  </div>
  <p class="note">${tr('bp.note', 'Height from mempool.space (fallback blockstream.info), cached ~60s on this server. Time remaining assumes ~10 minutes per block and is an estimate.')}</p>`;
}

const pg = document.getElementById('blocks-page');
if (pg) { page(pg); setInterval(() => page(pg), 60_000); I18N.onChange(() => page(pg)); }
