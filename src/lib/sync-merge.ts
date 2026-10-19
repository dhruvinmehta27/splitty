import type { Expense, Group, Tombstone } from './store';
import type { SyncExpense, SyncResponse } from './sync-types';

type Data = { groups: Group[]; expenses: Expense[]; tombstones: Record<string, Tombstone> };

/** What to send for a group: the group itself, its expenses, and its deletions. */
export function outgoing(data: Data, groupId: string): { group?: Group; expenses: SyncExpense[] } {
  const expenses: SyncExpense[] = data.expenses.filter((e) => e.groupId === groupId);
  for (const [id, t] of Object.entries(data.tombstones)) {
    if (t.groupId === groupId)
      expenses.push({ id, groupId, updatedAt: t.deletedAt, deletedAt: t.deletedAt });
  }
  return { group: data.groups.find((g) => g.id === groupId), expenses };
}

/** Applies what the server sent. The most recent edit of each record wins. */
export function applyRemote(data: Data, groupId: string, remote: SyncResponse): Data {
  let groups = data.groups;
  if (remote.group) {
    const local = groups.find((g) => g.id === groupId);
    if (!local) groups = [remote.group as Group, ...groups];
    else if (remote.group.updatedAt > local.updatedAt) {
      groups = groups.map((g) => (g.id === groupId ? (remote.group as Group) : g));
    }
  }

  const expenses = new Map(data.expenses.map((e) => [e.id, e]));
  const tombstones = { ...data.tombstones };
  for (const r of remote.expenses) {
    if (r.groupId !== groupId) continue;
    const local = expenses.get(r.id);
    const localTime = local?.updatedAt ?? tombstones[r.id]?.deletedAt ?? -1;
    if (r.updatedAt <= localTime) continue;
    if (r.deletedAt) {
      expenses.delete(r.id);
      tombstones[r.id] = { groupId, deletedAt: r.deletedAt };
    } else {
      expenses.set(r.id, r as unknown as Expense);
      delete tombstones[r.id];
    }
  }
  return { groups, expenses: [...expenses.values()], tombstones };
}
