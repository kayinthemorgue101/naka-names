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
