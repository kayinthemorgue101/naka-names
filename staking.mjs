// ---- $SHNAKAS staking weeks (Ord Dropz vault): start 971,700, 1,008-block weeks, 78 weeks ----
export const STAKE = { start: 971700, week: 1008, weeks: 78 };
export function stakingInfo(h, avgMs = 600_000, S = STAKE) {
  const end = S.start + S.weeks * S.week;
  const base = { startBlock: S.start, weekBlocks: S.week, totalWeeks: S.weeks, endBlock: end };
  if (h == null) return { ...base, state: 'unknown' };
  if (h < S.start) return { ...base, state: 'before', blocksToStart: S.start - h, estMsToStart: (S.start - h) * avgMs };
  if (h >= end) return { ...base, state: 'ended', week: S.weeks, weeksPaid: S.weeks, blocksSinceEnd: h - end };
  const into = (h - S.start) % S.week;
  const week = Math.floor((h - S.start) / S.week) + 1;
  const left = S.week - into;
  return { ...base, state: 'live', week, weeksPaid: week - 1, blocksIntoWeek: into, blocksLeftInWeek: left, weekEndBlock: h + left, estMsLeftInWeek: left * avgMs, blocksToEnd: end - h };
}

// ---- .ics claim reminders: one event per remaining week end (estimated times; block is the deadline) ----
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const icsDate = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// fold to 75 octets per RFC 5545 (UTF-8 aware)
function fold(line) {
  const out = []; let cur = '', n = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
export function shnakasIcs(h, avgMs = 600_000, now = Date.now(), S = STAKE) {
  const s = stakingInfo(h, avgMs, S);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//naka-names.xyz//SHNAKAS claim reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:$SHNAKAS claim reminders'];
  const first = s.state === 'live' ? s.week : s.state === 'before' ? 1 : S.weeks + 1;
  for (let w = first; w <= S.weeks; w++) {
    const endBlock = S.start + w * S.week;
    const t = now + (endBlock - h) * avgMs;
    const desc = `Week ${w} of ${S.weeks} paid — claim your $SHNAKAS in your Ord Dropz vault. Time is an estimate; block ${endBlock.toLocaleString('en-US')} is the real deadline. naka-names.xyz/halving`;
    L.push('BEGIN:VEVENT', `UID:shnakas-week-${w}@naka-names.xyz`, `SEQUENCE:${h}`, `DTSTAMP:${icsDate(now)}`, `DTSTART:${icsDate(t)}`, `DTEND:${icsDate(t + 1_800_000)}`,
      `SUMMARY:${icsEsc(`$SHNAKAS week ${w} of ${S.weeks} paid (est.)`)}`, `DESCRIPTION:${icsEsc(desc)}`, 'URL:https://naka-names.xyz/halving', 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(`$SHNAKAS week ${w} paid — claim in your Ord Dropz vault`)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}
