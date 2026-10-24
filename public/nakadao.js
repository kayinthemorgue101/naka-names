// Naka Council live tally — read-only mirror of the Naka Council vote. Talks only to /api/nakadao (server caches 60s).
const I18N = window.NAKA_I18N || { t: (_k, en) => en, onChange() {}, lang: 'en' };
const tr = I18N.t;
const VAULT = 'https://ord-dropz.xyz/wallet';
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = document.getElementById('dao-page');
let data = null, err = null;

async function load() {
  try {
    const r = await fetch('/api/nakadao', { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    data = await r.json(); err = null;
  } catch (e) { err = e; }
  render();
}
function ago() {
  if (!data?.fetchedAt) return '';
  const s = Math.max(0, Math.round((Date.now() - data.fetchedAt) / 1000));
  return s < 120 ? tr('dao.ago', `updated ${s} sec ago`, { s }) : tr('dao.agom', `updated ${Math.floor(s / 60)} min ago`, { m: Math.floor(s / 60) });
}
function topicHtml(t) {
  const zh = I18N.lang === 'zh-CN';
  const title = (zh && t.titleZh) || t.title;
  const blurb = (zh && t.blurbZh) || t.blurb;
  const rows = [...t.candidates].sort((a, b) => b.votes - a.votes);
  const total = rows.reduce((s, c) => s + c.votes, 0) + (t.none || 0);
  const pct = (v) => (total ? (v / total) * 100 : 0);
  const max = Math.max(1, ...rows.map((c) => c.votes), t.none || 0);
  const status = t.status === 'open' ? tr('dao.status.open', 'Voting open') : tr('dao.status.closed', esc(t.status || 'closed'));
  const winners = (t.rounds || []).filter((r) => r.winner).map((r) => {
    const c = t.candidates.find((x) => x.id === r.winner);
    const w = esc(c?.card?.title || r.winner);
    return `<p class="dim">${tr('dao.winner', `Round ${r.round} winner: ${w}`, { n: r.round, w })}</p>`;
  }).join('');
  const row = (c, i) => {
    const name = esc(c.card?.title || tr('dao.unknown', 'Unknown collection'));
    const artist = c.card?.artist ? esc(c.card.artist) : '';
    const ed = c.card?.editionSize ? ` · ${tr('dao.ed', `${fmt(c.card.editionSize)} ed.`, { n: fmt(c.card.editionSize) })}` : '';
    const img = c.card && /^listing_\d+$/.test(c.listingId || '') ? `<img src="/api/nakadao/img/thumbnail/${c.listingId}" alt="" loading="lazy" width="44" height="44">` : `<span class="dao-ph">?</span>`;
    return `<li class="dao-row${i === 0 && c.votes ? ' lead' : ''}"><span class="dao-rank">${i + 1}</span>${img}
      <div class="dao-main"><p class="dao-name"><b>${name}</b>${artist ? ` <span class="dim">${artist}${ed}</span>` : ''}</p>
      <div class="dao-bar"><i style="width:${((c.votes / max) * 100).toFixed(2)}%"></i></div></div>
      <p class="dao-n"><b>${fmt(c.votes)}</b><span>${pct(c.votes).toFixed(1)}%</span></p></li>`;
  };
  const board = t.showTotalsLive ? `<ol class="dao-list">${rows.map(row).join('')}
      <li class="dao-row none"><span class="dao-rank">—</span><span class="dao-ph">∅</span>
      <div class="dao-main"><p class="dao-name"><b>${tr('dao.none', 'None of these')}</b></p><div class="dao-bar"><i style="width:${(((t.none || 0) / max) * 100).toFixed(2)}%"></i></div></div>
      <p class="dao-n"><b>${fmt(t.none)}</b><span>${pct(t.none || 0).toFixed(1)}%</span></p></li></ol>` : `<p class="dim">${tr('dao.hidden', 'Live totals are hidden for this round.')}</p>`;
  return `<section class="dao-topic">
    <p class="dao-tag"><span class="pill ok">● ${tr('dao.live', 'Live tally')}</span> <span class="pill">${tr('dao.round', `Round ${t.round}`, { n: t.round })}</span> <span class="pill">${status}</span></p>
    <h2 class="dao-q">${esc(title)}</h2>
    ${blurb ? `<p class="lede">${esc(blurb)}</p>` : ''}
    <div class="stats"><div class="stat"><b>${fmt(t.ballots)}</b><span>${tr('dao.ballots', 'Total ballots')}</span></div><div class="stat"><b>${rows.length}</b><span>${tr('dao.cands', 'Candidates')}</span></div>${t.snapshotHeight ? `<div class="stat"><b>${fmt(t.snapshotHeight)}</b><span>${tr('dao.snap', 'Snapshot block')}</span></div>` : ''}</div>
    ${board}${winners}</section>`;
}
function render() {
  if (!data) { root.innerHTML = err ? `<p class="dim">${tr('dao.err', 'Vote data is unavailable right now.')}</p>` : ''; return; }
  root.innerHTML = `<h1><em>${tr('dao.h1', 'Naka Council')}</em></h1>
    ${data.topics.map(topicHtml).join('')}
    <p class="dao-upd dim"><span id="dao-ago">${ago()}</span>${data.stale || err ? ` · <span class="warn">${tr('dao.stale', 'upstream not responding, showing cached numbers')}</span>` : ''}</p>
    <p class="go"><a class="btn claim" href="${VAULT}" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="council" data-umami-event-label="go-vote">${tr('dao.go', 'Go vote in your vault →')}</a></p>
    <p class="dim dao-credit">${tr('dao.credit', 'Tally from the Naka Council vote run by <a href="https://ord-dropz.xyz/" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="council" data-umami-event-label="ord-dropz-credit">Ord Dropz</a>. Read-only mirror, refreshed every 60 seconds; voting happens in the Shielded Vault.')}</p>`;
}
load();
setInterval(load, 60_000);
setInterval(() => { const e = document.getElementById('dao-ago'); if (e) e.textContent = ago(); }, 1000);
I18N.onChange(render);
