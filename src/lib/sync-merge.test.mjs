import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyRemote, outgoing } from './sync-merge.ts';

const group = (updatedAt, name = 'Trip') => ({
  id: 'g',
  name,
  currency: 'EUR',
  members: [],
  createdAt: 0,
  updatedAt,
});
const expense = (id, updatedAt, description = id) => ({ id, groupId: 'g', description, updatedAt });
const empty = { groups: [], expenses: [], tombstones: {} };

test('joining adds the group and its expenses', () => {
  const out = applyRemote(empty, 'g', { group: group(1), expenses: [expense('a', 1)], now: 10 });
  assert.equal(out.groups.length, 1);
  assert.deepEqual(
    out.expenses.map((e) => e.id),
    ['a'],
  );
});

test('the newer edit wins in both directions', () => {
  const local = { ...empty, groups: [group(5, 'Local')], expenses: [expense('a', 5, 'local')] };
  const older = applyRemote(local, 'g', {
    group: group(3, 'Old'),
    expenses: [expense('a', 3, 'old')],
    now: 9,
  });
  assert.equal(older.groups[0].name, 'Local');
  assert.equal(older.expenses[0].description, 'local');
  const newer = applyRemote(local, 'g', {
    group: group(7, 'New'),
    expenses: [expense('a', 7, 'new')],
    now: 9,
  });
  assert.equal(newer.groups[0].name, 'New');
  assert.equal(newer.expenses[0].description, 'new');
});

test('remote deletions remove the expense and are remembered', () => {
  const local = { ...empty, groups: [group(1)], expenses: [expense('a', 1)] };
  const out = applyRemote(local, 'g', {
    expenses: [{ id: 'a', groupId: 'g', updatedAt: 2, deletedAt: 2 }],
    now: 3,
  });
  assert.equal(out.expenses.length, 0);
  assert.deepEqual(out.tombstones.a, { groupId: 'g', deletedAt: 2 });
});

test('a local deletion beats an older remote copy', () => {
  const local = { ...empty, groups: [group(1)], tombstones: { a: { groupId: 'g', deletedAt: 5 } } };
  const out = applyRemote(local, 'g', { expenses: [expense('a', 4)], now: 6 });
  assert.equal(out.expenses.length, 0);
});

test('outgoing includes deletions for that group only', () => {
  const data = {
    groups: [group(1)],
    expenses: [expense('a', 1), { ...expense('x', 1), groupId: 'other' }],
    tombstones: { b: { groupId: 'g', deletedAt: 2 }, y: { groupId: 'other', deletedAt: 2 } },
  };
  const out = outgoing(data, 'g');
  assert.deepEqual(
    out.expenses.map((e) => e.id),
    ['a', 'b'],
  );
  assert.equal(out.expenses[1].deletedAt, 2);
});
