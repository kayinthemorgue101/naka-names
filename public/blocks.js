// $SHNAKAS rewards watch — Bitcoin tip height vs the announced start block. Talks only to /api/blocks.
const TARGET = 971700;
const MP = 'https://mempool.space';
const fmt = (n) => Number(n).toLocaleString('en-US');
function eta(blocks) {
  const m = blocks * 10;
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `~${d}d ${h}h` : h ? `~${h}h ${mm}m` : `~${mm}m`;
}
async function getBlocks() {
  const r = await fetch('/api/blocks');
  if (!r.ok) throw new Error('blocks unavailable');
  return r.json();
}
const ago = (t) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

function cardHtml(b) {
  const h = b?.height;
  if (h == null) return `<p class="sub" style="margin:0">Block height unavailable right now. No number shown rather than a guess.</p>`;
  const left = Math.max(0, TARGET - h);
  return `<div class="bw-row">
    <div><b><a href="${MP}/block-height/${h}" target="_blank" rel="noopener">${fmt(h)}</a></b><span>tip height${b.stale ? ' · stale' : ''}</span></div>
    <div><b>${b.reached ? '0' : fmt(left)}</b><span>blocks to ${fmt(TARGET)}</span></div>
    <div><b>${b.reached ? '—' : eta(left)}</b><span>est. time (~10 min/block)</span></div>
  </div>
  ${b.reached ? `<p class="bw-reached">Target block reached. This does not mean rewards are active.</p>` : ''}`;
}

export async function blocksCard(el) {
  if (!el) return;
  const draw = async () => {
    let b = null; try { b = await getBlocks(); } catch {}
    if (!el.isConnected) return false;
    el.innerHTML = `<h2>$SHNAKAS Rewards Watch</h2>
    <div class="card bw">
      ${cardHtml(b)}
      <p class="bw-links"><a href="/blocks" target="_self">Details →</a> · <a href="${MP}" target="_blank" rel="noopener">mempool.space ↗</a> · <span class="dim">announced start block, unconfirmed</span></p>
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
  <h1>$SHNAKAS<br><em>Rewards Watch</em></h1>
  <p class="lede">Bitcoin block height, live, against the announced start block <b>${fmt(TARGET)}</b>.</p>
  ${h == null ? `<div class="result invalid"><p class="verdict">Height unavailable</p><p class="sub">Neither mempool.space nor blockstream.info answered. No number is shown rather than a guess.</p></div>` : `
  <div class="result ${reached ? 'free' : 'pending'}">
    <p class="verdict">${reached ? 'Target block reached' : `${fmt(left)} blocks to go`}</p>
    <p class="sub">${reached
      ? 'Block 971,700 has been mined. <b>This does not mean rewards are active.</b> Rewards depend on Ord Dropz and the Shielded Vault, not on this page.'
      : `Estimated <b>${eta(left)}</b> at ~10 minutes per block. This is an estimate: real block times vary a lot.`}</p>
    <dl class="kv">
      <dt>Tip height</dt><dd><a href="${MP}/block-height/${h}" target="_blank" rel="noopener">${fmt(h)} ↗</a>${b.stale ? '<span class="pill">stale</span>' : ''}</dd>
      <dt>Start block</dt><dd class="bw-dd"><a href="${MP}/block/${TARGET}" target="_blank" rel="noopener">${fmt(TARGET)} ↗</a><span class="dim">(link resolves only once mined)</span></dd>
      <dt>Remaining</dt><dd>${fmt(left)} blocks</dd>
      <dt>Source</dt><dd class="bw-dd">${b.source ?? '—'} · checked ${ago(b.fetchedAt)}</dd>
    </dl>
  </div>`}
  <h2>What this is</h2>
  <div class="card">
    <p style="margin-top:0">${fmt(TARGET)} is the <b>announced start block</b> for $SHNAKAS rewards. Source: a post on X by <a href="https://x.com/Ob1_Wan_Satoshi" target="_blank" rel="noopener">@Ob1_Wan_Satoshi</a> (“START BLOCK 👉 971,700”).</p>
    <p>It is <b>not confirmed</b> on the official Ord Dropz pages; the staking page says it will be back online soon. Check <a href="https://ord-dropz.xyz/rewards" target="_blank" rel="noopener">ord-dropz.xyz/rewards</a> for the official word.</p>
    <p style="margin-bottom:0">Reaching the block does not switch anything on. Rewards depend on Ord Dropz and the Shielded Vault. This page only counts blocks.</p>
  </div>
  <p class="note">Height from mempool.space (fallback blockstream.info), cached ~60s on this server. Time remaining assumes ~10 minutes per block and is an estimate.</p>`;
}

const pg = document.getElementById('blocks-page');
if (pg) { page(pg); setInterval(() => page(pg), 60_000); }
