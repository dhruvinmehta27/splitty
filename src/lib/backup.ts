import type { Expense, Group } from '@/lib/store';

const APP = 'splitty';
const VERSION = 1;

export type Backup = {
  app: typeof APP;
  version: number;
  exportedAt: string;
  groups: Group[];
  expenses: Expense[];
};

export function makeBackup(groups: Group[], expenses: Expense[]): string {
  const backup: Backup = {
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    groups,
    expenses,
  };
  return JSON.stringify(backup, null, 2);
}

export function backupFileName(date = new Date()) {
  return `splitty-backup-${date.toISOString().slice(0, 10)}.json`;
}

/** Parses a backup file, throwing a readable error if it isn't one. */
export function parseBackup(text: string): Pick<Backup, 'groups' | 'expenses'> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Splitty backup.");
  }
  const b = data as Partial<Backup>;
  if (b?.app !== APP || !Array.isArray(b.groups) || !Array.isArray(b.expenses)) {
    throw new Error("This file isn't a Splitty backup.");
  }
  if ((b.version ?? 0) > VERSION)
    throw new Error('This backup is from a newer version of Splitty.');
  const validGroup = (g: Group) => typeof g?.id === 'string' && Array.isArray(g.members);
  const validExpense = (e: Expense) =>
    typeof e?.id === 'string' && typeof e.amountCents === 'number' && typeof e.shares === 'object';
  if (!b.groups.every(validGroup) || !b.expenses.every(validExpense)) {
    throw new Error('This backup is damaged.');
  }
  return { groups: b.groups, expenses: b.expenses };
}

/** Adds groups and expenses that aren't already present, matched by id, so importing twice is harmless. */
export function mergeBackup(
  current: { groups: Group[]; expenses: Expense[] },
  incoming: { groups: Group[]; expenses: Expense[] },
) {
  const groupIds = new Set(current.groups.map((g) => g.id));
  const expenseIds = new Set(current.expenses.map((e) => e.id));
  const groups = incoming.groups.filter((g) => !groupIds.has(g.id));
  const keptGroupIds = new Set([...groupIds, ...groups.map((g) => g.id)]);
  const expenses = incoming.expenses.filter(
    (e) => !expenseIds.has(e.id) && keptGroupIds.has(e.groupId),
  );
  return {
    groups: [...current.groups, ...groups],
    expenses: [...current.expenses, ...expenses],
    added: { groups: groups.length, expenses: expenses.length },
  };
}
