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
function eta(blocks, ms = 600_000) {
  const m = Math.round(blocks * ms / 60_000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? tr('eta.d', `~${d}d ${h}h`, { d, h }) : h ? tr('eta.h', `~${h}h ${mm}m`, { h, m: mm }) : tr('eta.m', `~${mm}m`, { m: mm });
}
async function getBlocks() {
  const r = await fetch('/api/blocks');
  if (!r.ok) throw new Error('blocks unavailable');
  return r.json();
}
// 'est. Mar–Apr 2028' from [early, late] ms timestamps (recent avg vs 10 min/block)
function monthRange(r) {
  if (!r) return '—';
  const [a, b] = r.map((t) => new Date(t));
  const zh = I18N.lang === 'zh-CN';
  const mo = (d) => d.toLocaleString(zh ? 'zh-CN' : 'en-US', { month: 'short' });
  const y = (d) => d.getFullYear();
  let s;
  if (y(a) === y(b)) s = mo(a) === mo(b) ? (zh ? `${y(a)}年${mo(a)}` : `${mo(a)} ${y(a)}`) : (zh ? `${y(a)}年${mo(a)}–${mo(b)}` : `${mo(a)}–${mo(b)} ${y(a)}`);
  else s = zh ? `${y(a)}年${mo(a)}–${y(b)}年${mo(b)}` : `${mo(a)} ${y(a)}–${mo(b)} ${y(b)}`;
  return tr('hp.range', `est. ${s}`, { r: s });
}
const mins = (ms) => (ms / 60_000).toFixed(1);
const sbar = (pct, l, mid, r) => `<div class="hv-bar sk-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(1)}"><i style="width:${pct.toFixed(2)}%"></i></div>
  <p class="hv-bar-l"><span>${l}</span><span>${mid}</span><span>${r}</span></p>`;
function stakeCompact(b) {
  const s = b?.staking;
  if (!s || s.state === 'unknown') return '';
  const ms = b.avgBlockMs || 600_000;
  if (s.state === 'before') return `<p class="hv-sub sk-line">${tr('sk.c.before', `$SHNAKAS staking starts at block ${fmt(s.startBlock)} · ${fmt(s.blocksToStart)} blocks`, { b: fmt(s.startBlock), n: fmt(s.blocksToStart) })}</p>`;
  if (s.state === 'ended') return `<p class="hv-sub sk-line">${tr('sk.c.ended', `$SHNAKAS staking: all ${s.totalWeeks} weeks done`, { w: s.totalWeeks })}</p>`;
  return `<p class="hv-sub sk-line"><b>$SHNAKAS</b> · ${tr('sk.weekof', `Week ${s.week} of ${s.totalWeeks}`, { w: s.week, t: s.totalWeeks })} · ${tr('sk.c.left', `${fmt(s.blocksLeftInWeek)} blocks left (${eta(s.blocksLeftInWeek, ms)})`, { n: fmt(s.blocksLeftInWeek), eta: eta(s.blocksLeftInWeek, ms) })}</p>
  <div class="hv-bar sk-bar sk-mini" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${(s.blocksIntoWeek / s.weekBlocks * 100).toFixed(1)}"><i style="width:${(s.blocksIntoWeek / s.weekBlocks * 100).toFixed(2)}%"></i></div>`;
}
function stakeSection(b) {
  const s = b?.staking;
  const ms = b?.avgBlockMs || 600_000;
  const facts = `<ul class="sk-facts">
      <li>${tr('sk.f1', `Weeks are <b>1,008 blocks</b>, starting at block <b>971,700</b>. 78 weeks total.`)}</li>
      <li>${tr('sk.f2', 'A week is paid once it is over.')}</li>
      <li>${tr('sk.f3', 'Pieces earn only while they sit <b>unlisted</b> in the vault.')}</li>
      <li>${tr('sk.f4', 'Nothing to sign, nothing to lock. Claim anytime.')}</li>
    </ul>`;
  const endLine = `<p class="hv-sub">${tr('sk.end', 'Earning ends at block <b>1,050,324</b> (971,700 + 78 × 1,008), about 324 blocks (~2 days) after the halving at 1,050,000.')}</p>`;
  let body;
  if (!s || s.state === 'unknown') body = `<p class="sub" style="margin:0">${tr('bw.unavail', 'Block height unavailable right now. No number shown rather than a guess.')}</p>`;
  else if (s.state === 'before') body = `<p class="verdict" style="font-size:20px;margin:0">${tr('sk.before', 'Not started yet')}</p>
    <p class="sub">${tr('sk.before.sub', `Week 1 starts at block <b>${fmt(s.startBlock)}</b>: ${fmt(s.blocksToStart)} blocks to go (${eta(s.blocksToStart, ms)}, estimate).`, { b: fmt(s.startBlock), n: fmt(s.blocksToStart), eta: eta(s.blocksToStart, ms) })}</p>`;
  else if (s.state === 'ended') body = `<p class="verdict" style="font-size:20px;margin:0">${tr('sk.ended', `All ${s.totalWeeks} weeks are over`, { w: s.totalWeeks })}</p>
    <p class="sub">${tr('sk.ended.sub', `Earning stopped at block ${fmt(s.endBlock)}. Every week has been paid; claim anytime.`, { b: fmt(s.endBlock) })}</p>
    ${sbar(100, fmt(s.startBlock), tr('sk.allpaid', `${s.totalWeeks} / ${s.totalWeeks} weeks`, { t: s.totalWeeks }), fmt(s.endBlock))}`;
  else body = `<div class="bw-row">
      <div><b>${tr('sk.weekof', `Week ${s.week} of ${s.totalWeeks}`, { w: s.week, t: s.totalWeeks })}</b><span>${tr('sk.paid', `${s.weeksPaid} paid so far`, { n: s.weeksPaid })}</span></div>
      <div><b>${fmt(s.blocksLeftInWeek)}</b><span>${tr('sk.left', 'blocks left in week')}</span></div>
      <div><b>${eta(s.blocksLeftInWeek, ms)}</b><span>${tr('sk.est', `est. (~${mins(ms)} min/block)`, { m: mins(ms) })}</span></div>
    </div>
    ${sbar((s.blocksIntoWeek / s.weekBlocks) * 100, fmt(s.weekEndBlock - s.weekBlocks), tr('sk.into', `${fmt(s.blocksIntoWeek)} / 1,008 blocks into week ${s.week}`, { n: fmt(s.blocksIntoWeek), w: s.week }), fmt(s.weekEndBlock))}
    <p class="hv-sub">${tr('sk.weekend', `Week ${s.week} ends at block ${fmt(s.weekEndBlock)}. ${fmt(s.blocksToEnd)} blocks until earning ends.`, { w: s.week, b: fmt(s.weekEndBlock), n: fmt(s.blocksToEnd) })}</p>
    ${sbar(((s.week - 1) * s.weekBlocks + s.blocksIntoWeek) / (s.totalWeeks * s.weekBlocks) * 100, tr('sk.w1', 'week 1'), tr('sk.overall', 'all 78 weeks'), tr('sk.w78', 'week 78'))}`;
  return `<h2>${tr('sk.h2', '$SHNAKAS staking weeks')}</h2>
  <div class="card bw sk">
    ${body}
    ${endLine}
    ${facts}
    <p class="hv-sub" style="margin-bottom:0">${tr('sk.note', 'Week math from the Ord Dropz vault schedule. Earnings per piece are trait-weighted, so none are shown here.')} <a href="https://ord-dropz.xyz/" target="_blank" rel="noopener">Ord Dropz ↗</a></p>
  </div>`;
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
  <p class="hv-sub">${monthRange(b.estimatedRange)} · ${tr('hv.reward', `Subsidy ${btc(e.now)} BTC → ${btc(e.after)} BTC`, { a: btc(e.now), b: btc(e.after) })}</p>
  ${stakeCompact(b)}`;
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
    <p class="sub">${tr('hp.est2', `<b>${monthRange(b.estimatedRange)}</b>. The early end uses the recent average block time (~${mins(b.avgBlockMs || 600_000)} min), the late end uses 10 minutes. <b>This is an estimate</b>: real block times wander, and the date drifts with them.`, { r: monthRange(b.estimatedRange), m: mins(b.avgBlockMs || 600_000) })}</p>
    ${bar(e, h)}
    <dl class="kv">
      <dt>${tr('bw.tip', 'Tip height')}</dt><dd><a href="${MP}/block-height/${h}" target="_blank" rel="noopener">${fmt(h)} ↗</a>${b.stale ? `<span class="pill">${tr('bw.stale', 'stale')}</span>` : ''}</dd>
      <dt>${tr('hp.at', 'Halving block')}</dt><dd>${fmt(e.next)}</dd>
      <dt>${tr('bp.remain', 'Remaining')}</dt><dd>${tr('bp.blocks', `${fmt(left)} blocks`, { n: fmt(left) })}</dd>
      <dt>${tr('hp.eta', 'Est. date (estimate)')}</dt><dd class="bw-dd">${monthRange(b.estimatedRange)}</dd>
      <dt>${tr('hp.now', 'Subsidy now')}</dt><dd>${btc(e.now)} BTC</dd>
      <dt>${tr('hp.after', 'Subsidy after')}</dt><dd>${btc(e.after)} BTC</dd>
      <dt>${tr('hp.epoch', 'Epoch')}</dt><dd class="bw-dd">${fmt(e.start)} → ${fmt(e.next)}</dd>
      <dt>${tr('bp.source', 'Source')}</dt><dd class="bw-dd">${tr('bp.checked', `${b.source ?? '—'} · checked ${ago(b.fetchedAt)}`, { src: b.source ?? '—', t: ago(b.fetchedAt) })}</dd>
    </dl>
  </div>`}
  ${stakeSection(b)}
  <h2>${tr('bp.what', 'What this is')}</h2>
  <div class="card">
    <p style="margin-top:0">${tr('hp.p1', 'Every <b>210,000 blocks</b> (roughly four years) the new-coin subsidy miners get per block is cut in half. 50 → 25 → 12.5 → 6.25 → 3.125 BTC. The last cut was block <b>840,000</b> in April 2024.')}</p>
    <p>${tr('hp.p2', `At block <b>${fmt(e.next)}</b> it drops from ${btc(e.now)} to ${btc(e.after)} BTC. Nobody votes on it, nobody can stop it. The code just quietly halves the reward and carries on.`, { t: fmt(e.next), a: btc(e.now), b: btc(e.after) })}</p>
    <p style="margin-bottom:0">${tr('hp.p3', 'Transaction fees are not halved. This page only counts blocks; it is not advice about anything.')}</p>
  </div>
  <p class="note">${tr('bp.note', 'Height from mempool.space (fallback blockstream.info), cached ~60s on this server. Date range uses the recent average block time from mempool.space and 10 minutes per block; it is an estimate.')}</p>`;
}

const pg = document.getElementById('blocks-page');
if (pg) { page(pg); setInterval(() => page(pg), 60_000); I18N.onChange(() => page(pg)); }
