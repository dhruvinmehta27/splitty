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
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
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
      addExpense: (expense) =>
        set((s) => ({ expenses: [{ ...expense, id: newId(), createdAt: Date.now() }, ...s.expenses] })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
    }),
    { name: 'splitty', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

const formatters: Record<string, Intl.NumberFormat> = {};

export function formatMoney(cents: number, currency: string) {
  formatters[currency] ??= new Intl.NumberFormat(undefined, { style: 'currency', currency });
  return formatters[currency].format(cents / 100);
}
