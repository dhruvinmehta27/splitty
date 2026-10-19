import assert from 'node:assert/strict';
import { test } from 'node:test';

import { balances, computeSplit, owedTo, parseCents } from './split.ts';

const sum = (shares) => Object.values(shares).reduce((a, b) => a + b, 0);

test('parseCents', () => {
  assert.equal(parseCents('12,50'), 1250);
  assert.equal(parseCents('12.5'), 1250);
  assert.equal(parseCents('0.07'), 7);
  assert.equal(parseCents('.5'), 50);
  assert.equal(parseCents('7'), 700);
  assert.equal(parseCents('1.234'), null);
  assert.equal(parseCents('abc'), null);
  assert.equal(parseCents(''), null);
});

test('equal split spreads leftover cents', () => {
  const r = computeSplit('equal', 1000, ['a', 'b', 'c'], {});
  assert.ok(r.ok);
  assert.equal(sum(r.shares), 1000);
  assert.deepEqual(Object.values(r.shares).sort(), [333, 333, 334]);
});

test('equal split skips excluded members', () => {
  const r = computeSplit('equal', 1000, ['a', 'b', 'c'], { c: 'off' });
  assert.deepEqual(r, { ok: true, shares: { a: 500, b: 500 } });
});

test('exact split must add up', () => {
  assert.equal(computeSplit('exact', 1000, ['a', 'b'], { a: '4', b: '5' }).ok, false);
  assert.deepEqual(computeSplit('exact', 1000, ['a', 'b'], { a: '4', b: '6,00' }), {
    ok: true,
    shares: { a: 400, b: 600 },
  });
});

test('percent split must total 100', () => {
  assert.equal(computeSplit('percent', 1000, ['a', 'b'], { a: '50', b: '40' }).ok, false);
  const r = computeSplit('percent', 1001, ['a', 'b', 'c'], { a: '33.3', b: '33.3', c: '33.4' });
  assert.ok(r.ok);
  assert.equal(sum(r.shares), 1001);
});

test('shares split', () => {
  const r = computeSplit('shares', 900, ['a', 'b'], { a: '2', b: '1' });
  assert.deepEqual(r, { ok: true, shares: { a: 600, b: 300 } });
});

test('balances net to zero', () => {
  const net = balances([
    { paidBy: 'a', amountCents: 900, shares: { a: 300, b: 300, c: 300 } },
    { paidBy: 'b', amountCents: 300, shares: { a: 150, c: 150 } },
  ]);
  assert.deepEqual(net, { a: 450, b: 0, c: -450 });
  assert.equal(sum(net), 0);
});

test('owedTo counts only debts between me and the payer', () => {
  const expenses = [
    { paidBy: 'me', shares: { me: 300, a: 300, b: 300 } },
    { paidBy: 'a', shares: { me: 200, a: 200, b: 200 } },
    { paidBy: 'b', shares: { a: 500, b: 500 } },
  ];
  assert.deepEqual(owedTo('me', expenses), { a: 100, b: 300 });
});
