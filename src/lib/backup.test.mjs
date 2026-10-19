import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeBackup, mergeBackup, parseBackup } from './backup.ts';

const group = (id) => ({
  id,
  name: id,
  currency: 'EUR',
  members: [{ id: `${id}-you`, name: 'You' }],
  createdAt: 0,
});
const expense = (id, groupId) => ({
  id,
  groupId,
  description: id,
  amountCents: 100,
  paidBy: `${groupId}-you`,
  mode: 'equal',
  shares: { [`${groupId}-you`]: 100 },
  createdAt: 0,
});

test('a backup round-trips', () => {
  const data = { groups: [group('g1')], expenses: [expense('e1', 'g1')] };
  assert.deepEqual(parseBackup(makeBackup(data.groups, data.expenses)), data);
});

test('rejects files that are not backups', () => {
  assert.throws(() => parseBackup('not json'), /isn't a Splitty backup/);
  assert.throws(() => parseBackup('{"groups":[]}'), /isn't a Splitty backup/);
  assert.throws(
    () => parseBackup(JSON.stringify({ app: 'splitty', version: 99, groups: [], expenses: [] })),
    /newer version/,
  );
});

test('merging only adds what is missing', () => {
  const current = { groups: [group('g1')], expenses: [expense('e1', 'g1')] };
  const incoming = {
    groups: [group('g1'), group('g2')],
    expenses: [expense('e1', 'g1'), expense('e2', 'g2'), expense('orphan', 'gone')],
  };
  const merged = mergeBackup(current, incoming);
  assert.deepEqual(merged.added, { groups: 1, expenses: 1 });
  assert.deepEqual(
    merged.groups.map((g) => g.id),
    ['g1', 'g2'],
  );
  assert.deepEqual(
    merged.expenses.map((e) => e.id),
    ['e1', 'e2'],
  );
  assert.deepEqual(mergeBackup(merged, incoming).added, { groups: 0, expenses: 0 });
});
