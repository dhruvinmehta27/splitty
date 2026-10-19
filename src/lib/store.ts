import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Shares, SplitMode } from '@/lib/split';

export type Member = { id: string; name: string };

export type Group = {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  createdAt: number;
  updatedAt: number;
};

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  amountCents: number;
  paidBy: string;
  mode: SplitMode;
  shares: Shares;
  createdAt: number;
  updatedAt: number;
};

/** A shared group's secret and when it last synced (server clock). Never leaves this device except as the link. */
export type Share = { key: string; lastSync: number };

/** Remembers deleted expenses of shared groups so the deletion syncs instead of the expense coming back. */
export type Tombstone = { groupId: string; deletedAt: number };

type State = {
  groups: Group[];
  expenses: Expense[];
  /** Which member is "you" in each group. Groups you created default to their first member. */
  me: Record<string, string>;
  shares: Record<string, Share>;
  tombstones: Record<string, Tombstone>;
  addGroup: (name: string, memberNames: string[]) => string;
  addMember: (groupId: string, name: string) => string;
  renameMember: (groupId: string, memberId: string, name: string) => void;
  removeMember: (groupId: string, memberId: string) => void;
  deleteGroup: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteExpense: (id: string) => void;
  replaceAll: (groups: Group[], expenses: Expense[]) => void;
  setMe: (groupId: string, memberId: string) => void;
  setShare: (groupId: string, share: Share) => void;
};

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

function touchGroup(groups: Group[], groupId: string, change: (g: Group) => Partial<Group>) {
  return groups.map((g) => (g.id === groupId ? { ...g, ...change(g), updatedAt: Date.now() } : g));
}

// Everything lives on the device and updates synchronously; persistence happens in the background.
export const useStore = create<State>()(
  persist(
    (set) => ({
      groups: [],
      expenses: [],
      me: {},
      shares: {},
      tombstones: {},
      addGroup: (name, memberNames) => {
        const id = newId();
        const members = memberNames.map((n) => ({ id: newId(), name: n }));
        const now = Date.now();
        set((s) => ({
          groups: [
            { id, name, currency: 'EUR', members, createdAt: now, updatedAt: now },
            ...s.groups,
          ],
          me: { ...s.me, [id]: members[0].id },
        }));
        return id;
      },
      addMember: (groupId, name) => {
        const id = newId();
        set((s) => ({
          groups: touchGroup(s.groups, groupId, (g) => ({ members: [...g.members, { id, name }] })),
        }));
        return id;
      },
      renameMember: (groupId, memberId, name) =>
        set((s) => ({
          groups: touchGroup(s.groups, groupId, (g) => ({
            members: g.members.map((m) => (m.id === memberId ? { ...m, name } : m)),
          })),
        })),
      removeMember: (groupId, memberId) =>
        set((s) => ({
          groups: touchGroup(s.groups, groupId, (g) => ({
            members: g.members.filter((m) => m.id !== memberId),
          })),
        })),
      // Deleting a shared group only removes it from this device; friends keep their copy.
      deleteGroup: (id) =>
        set((s) => {
          const { [id]: _share, ...shares } = s.shares;
          return {
            groups: s.groups.filter((g) => g.id !== id),
            expenses: s.expenses.filter((e) => e.groupId !== id),
            shares,
          };
        }),
      addExpense: (expense) =>
        set((s) => {
          const now = Date.now();
          return {
            expenses: [{ ...expense, id: newId(), createdAt: now, updatedAt: now }, ...s.expenses],
          };
        }),
      deleteExpense: (id) =>
        set((s) => {
          const expense = s.expenses.find((e) => e.id === id);
          const shared = expense && s.shares[expense.groupId];
          return {
            expenses: s.expenses.filter((e) => e.id !== id),
            tombstones: shared
              ? { ...s.tombstones, [id]: { groupId: expense.groupId, deletedAt: Date.now() } }
              : s.tombstones,
          };
        }),
      replaceAll: (groups, expenses) => set({ groups, expenses }),
      setMe: (groupId, memberId) => set((s) => ({ me: { ...s.me, [groupId]: memberId } })),
      setShare: (groupId, share) => set((s) => ({ shares: { ...s.shares, [groupId]: share } })),
    }),
    {
      name: 'splitty',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted, version) => {
        const s = persisted as Partial<State>;
        if (version < 2) {
          // Version 1 had no edit times, no sharing, and "you" was always the first member.
          s.groups = (s.groups ?? []).map((g) => ({ ...g, updatedAt: g.updatedAt ?? g.createdAt }));
          s.expenses = (s.expenses ?? []).map((e) => ({
            ...e,
            updatedAt: e.updatedAt ?? e.createdAt,
          }));
          s.me = Object.fromEntries(s.groups.map((g) => [g.id, g.members[0]?.id]));
          s.shares = {};
          s.tombstones = {};
        }
        return s as State;
      },
    },
  ),
);

/** The member who is "you" in this group on this device. */
export function meIn(group: Group, me: Record<string, string>) {
  return me[group.id] ?? group.members[0]?.id;
}

const formatters: Record<string, Intl.NumberFormat> = {};

export function formatMoney(cents: number, currency: string) {
  formatters[currency] ??= new Intl.NumberFormat(undefined, { style: 'currency', currency });
  return formatters[currency].format(cents / 100);
}

/** True if the member paid for or has a share in any of these expenses. */
export function isInvolved(memberId: string, expenses: Expense[]) {
  return expenses.some((e) => e.paidBy === memberId || e.shares[memberId] !== undefined);
}
