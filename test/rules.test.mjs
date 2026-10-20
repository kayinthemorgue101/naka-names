import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classify, RESERVED_LABELS } from '../rules.mjs';

const EXAMPLES = ['degen', 'punks', 'crypt', 'sats', 'pepe', 'ordinal'];

test('the six example labels are valid and not reserved', () => {
  assert.equal(EXAMPLES.length, 6);
  for (const label of EXAMPLES) {
    assert.equal(label.includes('.'), false);
    assert.equal(RESERVED_LABELS.has(label), false);
    const c = classify(label);
    assert.equal(c.ok, true, label);
    assert.equal(c.reserved, undefined);
    assert.equal(c.label, label);
    assert.equal(c.ending, null);
    const named = classify(`${label}.naka`);
    assert.equal(named.ok, true);
    assert.equal(named.ending, 'naka');
  }
});

test('classify still rejects empty, short, reserved, and bad endings', () => {
  assert.equal(classify('').ok, false);
  assert.equal(classify('a').ok, false);
  assert.equal(classify('satoshi').reserved, true);
  assert.equal(classify('degen.btc').ok, false);
  assert.equal(classify('degen--naka').ok, false);
});

test('the checker offers exactly those six example words', () => {
  const src = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const m = src.match(/const EXAMPLES = (\[[^\]]+\])/);
  assert.ok(m, 'EXAMPLES list missing');
  assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"')), EXAMPLES);
  for (const old of ['kayy', 'obi', 'mortician', 'embalm', 'grave']) {
    assert.equal(src.includes(`'${old}'`), false);
  }
});

import { stakingInfo } from '../staking.mjs';
test('SHNAKAS staking weeks', () => {
  assert.equal(stakingInfo(971699).state, 'before');
  assert.deepEqual([stakingInfo(971700).week, stakingInfo(971700).blocksIntoWeek, stakingInfo(971700).blocksLeftInWeek], [1, 0, 1008]);
  assert.equal(stakingInfo(972707).week, 1);
  assert.equal(stakingInfo(972708).week, 2);
  assert.equal(stakingInfo(972708).weeksPaid, 1);
  assert.equal(stakingInfo(1050323).week, 78);
  assert.equal(stakingInfo(1050323).blocksLeftInWeek, 1);
  assert.equal(stakingInfo(1050324).state, 'ended');
  assert.equal(stakingInfo(0).endBlock, 1050324);
  assert.equal(stakingInfo(null).state, 'unknown');
});

import { shnakasIcs } from '../staking.mjs';
test('SHNAKAS .ics reminders', () => {
  const ics = shnakasIcs(972366, 600_000, Date.UTC(2026, 9, 20, 18, 0, 0));
  const ev = ics.match(/BEGIN:VEVENT/g).length;
  assert.equal(ev, 78);
  assert.match(ics, /UID:shnakas-week-1@naka-names\.xyz/);
  assert.match(ics, /UID:shnakas-week-78@naka-names\.xyz/);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 78);
  assert.ok(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75));
  // week 1 ends at 972,708: 342 blocks * 10 min after now
  assert.match(ics, /DTSTART:20261023T030000Z/);
  assert.equal(shnakasIcs(972708, 600_000).match(/BEGIN:VEVENT/g).length, 77);
  assert.equal(shnakasIcs(1050324, 600_000).match(/BEGIN:VEVENT/g), null);
  assert.equal(shnakasIcs(900000, 600_000).match(/BEGIN:VEVENT/g).length, 78);
});
