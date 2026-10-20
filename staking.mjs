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
