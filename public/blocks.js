// $SHNAKAS rewards watch — Bitcoin tip height vs the announced start block. Talks only to /api/blocks.
const TARGET = 971700;
const MP = 'https://mempool.space';
const I18N = window.NAKA_I18N || { t: (_k, en) => en, onChange() {} };
const tr = I18N.t;
const fmt = (n) => Number(n).toLocaleString('en-US');
function eta(blocks) {
  const m = blocks * 10;
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? tr('eta.d', `~${d}d ${h}h`, { d, h }) : h ? tr('eta.h', `~${h}h ${mm}m`, { h, m: mm }) : tr('eta.m', `~${mm}m`, { m: mm });
}
async function getBlocks() {
  const r = await fetch('/api/blocks');
  if (!r.ok) throw new Error('blocks unavailable');
  return r.json();
}
const ago = (t) => t ? new Date(t).toLocaleTimeString(I18N.lang === 'zh-CN' ? ['zh-CN'] : [], { hour: '2-digit', minute: '2-digit' }) : '—';

function cardHtml(b) {
  const h = b?.height;
  if (h == null) return `<p class="sub" style="margin:0">${tr('bw.unavail', 'Block height unavailable right now. No number shown rather than a guess.')}</p>`;
  const left = Math.max(0, TARGET - h);
  return `<div class="bw-row">
    <div><b><a href="${MP}/block-height/${h}" target="_blank" rel="noopener">${fmt(h)}</a></b><span>${tr('bw.tip', 'tip height')}${b.stale ? ` · ${tr('bw.stale', 'stale')}` : ''}</span></div>
    <div><b>${b.reached ? '0' : fmt(left)}</b><span>${tr('bw.to', `blocks to ${fmt(TARGET)}`, { t: fmt(TARGET) })}</span></div>
    <div><b>${b.reached ? '—' : eta(left)}</b><span>${tr('bw.est', 'est. time (~10 min/block)')}</span></div>
  </div>
  ${b.reached ? `<p class="bw-reached">${tr('bw.reached', 'Target block reached. This does not mean rewards are active.')}</p>` : ''}`;
}

export async function blocksCard(el) {
  if (!el) return;
  const draw = async () => {
    let b = null; try { b = await getBlocks(); } catch {}
    if (!el.isConnected) return false;
    el.innerHTML = `<h2>${tr('bw.h2', '$SHNAKAS Rewards Watch')}</h2>
    <div class="card bw">
      ${cardHtml(b)}
      <p class="bw-links"><a href="/blocks" target="_self">${tr('bw.details', 'Details →')}</a> · <a href="${MP}" target="_blank" rel="noopener">mempool.space ↗</a> · <span class="dim">${tr('bw.caveat', 'announced start block, unconfirmed')}</span></p>
    </div>`;
    return true;
  };
  if (await draw()) { const t = setInterval(async () => { if (!(await draw())) clearInterval(t); }, 60_000); }
}

async function page(el) {
  let b = null; try { b = await getBlocks(); } catch {}
  const h = b?.height, left = h == null ? null : Math.max(0, TARGET - h);
  const reached = !!b?.reached;
  el.innerHTML = `
  <h1>${tr('bp.h1', '$SHNAKAS<br><em>Rewards Watch</em>')}</h1>
  <p class="lede">${tr('bp.lede', `Bitcoin block height, live, against the announced start block <b>${fmt(TARGET)}</b>.`, { t: fmt(TARGET) })}</p>
  ${h == null ? `<div class="result invalid"><p class="verdict">${tr('bp.unavail', 'Height unavailable')}</p><p class="sub">${tr('bp.unavail.sub', 'Neither mempool.space nor blockstream.info answered. No number is shown rather than a guess.')}</p></div>` : `
  <div class="result ${reached ? 'free' : 'pending'}">
    <p class="verdict">${reached ? tr('bp.reached', 'Target block reached') : tr('bp.togo', `${fmt(left)} blocks to go`, { n: fmt(left) })}</p>
    <p class="sub">${reached
      ? tr('bp.reached.sub', 'Block 971,700 has been mined. <b>This does not mean rewards are active.</b> Rewards depend on Ord Dropz and the Shielded Vault, not on this page.')
      : tr('bp.est', `Estimated <b>${eta(left)}</b> at ~10 minutes per block. This is an estimate: real block times vary a lot.`, { eta: eta(left) })}</p>
    <dl class="kv">
      <dt>${tr('bw.tip', 'Tip height')}</dt><dd><a href="${MP}/block-height/${h}" target="_blank" rel="noopener">${fmt(h)} ↗</a>${b.stale ? `<span class="pill">${tr('bw.stale', 'stale')}</span>` : ''}</dd>
      <dt>${tr('bp.start', 'Start block')}</dt><dd class="bw-dd"><a href="${MP}/block/${TARGET}" target="_blank" rel="noopener">${fmt(TARGET)} ↗</a><span class="dim">${tr('bp.mined', '(link resolves only once mined)')}</span></dd>
      <dt>${tr('bp.remain', 'Remaining')}</dt><dd>${tr('bp.blocks', `${fmt(left)} blocks`, { n: fmt(left) })}</dd>
      <dt>${tr('bp.source', 'Source')}</dt><dd class="bw-dd">${tr('bp.checked', `${b.source ?? '—'} · checked ${ago(b.fetchedAt)}`, { src: b.source ?? '—', t: ago(b.fetchedAt) })}</dd>
    </dl>
  </div>`}
  <h2>${tr('bp.what', 'What this is')}</h2>
  <div class="card">
    <p style="margin-top:0">${tr('bp.p1', `${fmt(TARGET)} is the <b>announced start block</b> for $SHNAKAS rewards. Source: a post on X by <a href="https://x.com/Ob1_Wan_Satoshi" target="_blank" rel="noopener">@Ob1_Wan_Satoshi</a> (“START BLOCK 👉 971,700”).`, { t: fmt(TARGET) })}</p>
    <p>${tr('bp.p2', 'It is <b>not confirmed</b> on the official Ord Dropz pages; the staking page says it will be back online soon. Check <a href="https://ord-dropz.xyz/rewards" target="_blank" rel="noopener">ord-dropz.xyz/rewards</a> for the official word.')}</p>
    <p style="margin-bottom:0">${tr('bp.p3', 'Reaching the block does not switch anything on. Rewards depend on Ord Dropz and the Shielded Vault. This page only counts blocks.')}</p>
  </div>
  <p class="note">${tr('bp.note', 'Height from mempool.space (fallback blockstream.info), cached ~60s on this server. Time remaining assumes ~10 minutes per block and is an estimate.')}</p>`;
}

const pg = document.getElementById('blocks-page');
if (pg) { page(pg); setInterval(() => page(pg), 60_000); I18N.onChange(() => page(pg)); }
