// Shared by the app and the Vercel function in api/, so it must not import app code.

export type SyncGroup = {
  id: string;
  name: string;
  currency: string;
  members: { id: string; name: string }[];
  createdAt: number;
  updatedAt: number;
};

/** An expense, or a deleted one (deletedAt set, other fields may be stale). */
export type SyncExpense = {
  id: string;
  groupId: string;
  updatedAt: number;
  deletedAt?: number;
  [field: string]: unknown;
};

export type SyncRequest = {
  groupId: string;
  key: string;
  /** Server time of the last successful sync; 0 pulls everything. */
  since: number;
  /** Omitted when joining a group you don't have yet. */
  group?: SyncGroup;
  expenses: SyncExpense[];
};

export type SyncResponse = {
  /** Present if it changed on the server after `since`. */
  group?: SyncGroup;
  expenses: SyncExpense[];
  now: number;
};
