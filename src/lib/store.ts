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
};

type State = {
  groups: Group[];
  expenses: Expense[];
  addGroup: (name: string, memberNames: string[]) => string;
  addMember: (groupId: string, name: string) => void;
  removeMember: (groupId: string, memberId: string) => void;
  deleteGroup: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  replaceAll: (groups: Group[], expenses: Expense[]) => void;
};

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

// Everything lives on the device and updates synchronously; persistence happens in the background.
export const useStore = create<State>()(
  persist(
    (set) => ({
      groups: [],
      expenses: [],
      addGroup: (name, memberNames) => {
        const id = newId();
        const members = memberNames.map((n) => ({ id: newId(), name: n }));
        set((s) => ({
          groups: [{ id, name, currency: 'EUR', members, createdAt: Date.now() }, ...s.groups],
        }));
        return id;
      },
      addMember: (groupId, name) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, members: [...g.members, { id: newId(), name }] } : g,
          ),
        })),
      removeMember: (groupId, memberId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g,
          ),
        })),
      deleteGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          expenses: s.expenses.filter((e) => e.groupId !== id),
        })),
      addExpense: (expense) =>
        set((s) => ({
          expenses: [{ ...expense, id: newId(), createdAt: Date.now() }, ...s.expenses],
        })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      replaceAll: (groups, expenses) => set({ groups, expenses }),
    }),
    { name: 'splitty', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

const formatters: Record<string, Intl.NumberFormat> = {};

export function formatMoney(cents: number, currency: string) {
  formatters[currency] ??= new Intl.NumberFormat(undefined, { style: 'currency', currency });
  return formatters[currency].format(cents / 100);
}

/** True if the member paid for or has a share in any of these expenses. */
export function isInvolved(memberId: string, expenses: Expense[]) {
  return expenses.some((e) => e.paidBy === memberId || e.shares[memberId] !== undefined);
}
