import { Database } from '@sqlitecloud/drivers';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, timingSafeEqual } from 'node:crypto';

import type { SyncExpense, SyncGroup, SyncRequest, SyncResponse } from '../src/lib/sync-types';

// The only place that can reach the database. SQLITECLOUD_URL is a Vercel environment variable
// (the connection string with its API key) and never ships inside the app.

const MAX_EXPENSES = 2000;
const MAX_JSON = 20_000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS split_groups (
     id TEXT PRIMARY KEY, key_hash TEXT NOT NULL, data TEXT NOT NULL,
     updated_at INTEGER NOT NULL, synced_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS split_expenses (
     id TEXT PRIMARY KEY, group_id TEXT NOT NULL, data TEXT NOT NULL,
     updated_at INTEGER NOT NULL, synced_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS expenses_by_group ON split_expenses (group_id, synced_at)`,
];

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v);
const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function validGroup(g: unknown, groupId: string): g is SyncGroup {
  const x = g as SyncGroup;
  return (
    x?.id === groupId &&
    typeof x.name === 'string' &&
    typeof x.currency === 'string' &&
    Array.isArray(x.members) &&
    x.members.every((m) => isId(m?.id) && typeof m.name === 'string') &&
    isTime(x.updatedAt) &&
    JSON.stringify(x).length <= MAX_JSON
  );
}

function validExpense(e: unknown, groupId: string): e is SyncExpense {
  const x = e as SyncExpense;
  return (
    x?.groupId === groupId &&
    isId(x.id) &&
    isTime(x.updatedAt) &&
    JSON.stringify(x).length <= MAX_JSON
  );
}

let schemaReady = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.SQLITECLOUD_URL)
    return res.status(500).json({ error: 'Sync is not configured' });

  const body = req.body as SyncRequest;
  const { groupId, key, since } = body ?? {};
  if (!isId(groupId) || typeof key !== 'string' || key.length < 32 || !isTime(since)) {
    return res.status(400).json({ error: 'Bad request' });
  }
  const expenses = Array.isArray(body.expenses) ? body.expenses : [];
  if (expenses.length > MAX_EXPENSES || !expenses.every((e) => validExpense(e, groupId))) {
    return res.status(400).json({ error: 'Bad expenses' });
  }
  if (body.group !== undefined && !validGroup(body.group, groupId)) {
    return res.status(400).json({ error: 'Bad group' });
  }

  const db = new Database(process.env.SQLITECLOUD_URL);
  try {
    if (!schemaReady) {
      for (const statement of SCHEMA) await db.sql(statement);
      schemaReady = true;
    }
    const now = Date.now();
    const keyHash = hashKey(key);

    const [existing] =
      await db.sql`SELECT key_hash, updated_at FROM split_groups WHERE id = ${groupId}`;
    if (!existing) {
      // First sync of a newly shared group creates it; the key becomes its password.
      if (!body.group) return res.status(404).json({ error: 'Group not found' });
      await db.sql`INSERT INTO split_groups (id, key_hash, data, updated_at, synced_at)
        VALUES (${groupId}, ${keyHash}, ${JSON.stringify(body.group)}, ${body.group.updatedAt}, ${now})`;
    } else {
      if (!sameHash(existing.key_hash, keyHash))
        return res.status(403).json({ error: 'Wrong link' });
      if (body.group && body.group.updatedAt > existing.updated_at) {
        await db.sql`UPDATE split_groups SET data = ${JSON.stringify(body.group)},
          updated_at = ${body.group.updatedAt}, synced_at = ${now} WHERE id = ${groupId}`;
      }
    }

    for (const e of expenses) {
      const [stored] =
        await db.sql`SELECT group_id, updated_at FROM split_expenses WHERE id = ${e.id}`;
      if (!stored) {
        await db.sql`INSERT INTO split_expenses (id, group_id, data, updated_at, synced_at)
          VALUES (${e.id}, ${groupId}, ${JSON.stringify(e)}, ${e.updatedAt}, ${now})`;
      } else if (stored.group_id === groupId && e.updatedAt > stored.updated_at) {
        await db.sql`UPDATE split_expenses SET data = ${JSON.stringify(e)}, updated_at = ${e.updatedAt},
          synced_at = ${now} WHERE id = ${e.id}`;
      }
    }

    const [group] =
      await db.sql`SELECT data FROM split_groups WHERE id = ${groupId} AND synced_at > ${since}`;
    const changed = await db.sql`SELECT data FROM split_expenses
      WHERE group_id = ${groupId} AND synced_at > ${since}`;
    const response: SyncResponse = {
      group: group ? JSON.parse(group.data) : undefined,
      expenses: changed.map((row: { data: string }) => JSON.parse(row.data)),
      now,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Sync failed' });
  } finally {
    db.close();
  }
}
