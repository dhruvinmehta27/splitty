import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';

import { useStore } from '@/lib/store';
import { applyRemote, outgoing } from '@/lib/sync-merge';
import type { SyncRequest, SyncResponse } from '@/lib/sync-types';

/** The hosted server, e.g. https://splitty.vercel.app. Unset (like on GitHub Pages) means no sharing. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export const syncEnabled = Boolean(API_URL);

const POLL_MS = 15_000;
const DEBOUNCE_MS = 600;
// Ask for a little more than strictly new so a write landing in the same instant isn't missed.
const OVERLAP_MS = 5_000;

export function newShareKey() {
  const bytes = Crypto.getRandomBytes(32);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The key goes after # so browsers never send it to the server in the page request. */
export function shareLink(groupId: string, key: string) {
  return `${API_URL}/join/${groupId}#${key}`;
}

export function parseShareLink(text: string): { groupId: string; key: string } | null {
  const match = text.trim().match(/join\/([\w-]{1,64})#([\w-]{32,})/);
  return match ? { groupId: match[1], key: match[2] } : null;
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function post(request: SyncRequest): Promise<SyncResponse> {
  const res = await fetch(`${API_URL}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const message =
      res.status === 403
        ? 'This link is not valid for that group.'
        : res.status === 404
          ? 'That group no longer exists.'
          : 'Could not reach the server.';
    throw new SyncError(message, res.status);
  }
  return res.json();
}

function applyResponse(groupId: string, key: string, response: SyncResponse) {
  const s = useStore.getState();
  useStore.setState({
    ...applyRemote(s, groupId, response),
    shares: { ...s.shares, [groupId]: { key, lastSync: Math.max(0, response.now - OVERLAP_MS) } },
  });
}

const running = new Map<string, Promise<void>>();

/** Pushes this group's local data and pulls everyone else's changes. One sync per group at a time. */
export function syncGroup(groupId: string): Promise<void> {
  const current = running.get(groupId);
  if (current) return current;
  const task = (async () => {
    const s = useStore.getState();
    const share = s.shares[groupId];
    if (!syncEnabled || !share) return;
    const out = outgoing(s, groupId);
    const response = await post({ groupId, key: share.key, since: share.lastSync, ...out });
    applyResponse(groupId, share.key, response);
  })().finally(() => running.delete(groupId));
  running.set(groupId, task);
  return task;
}

/** Downloads a shared group from its link and keeps it in sync from then on. */
export async function joinGroup(groupId: string, key: string) {
  const response = await post({ groupId, key, since: 0, expenses: [] });
  if (!response.group) throw new SyncError('That group no longer exists.', 404);
  applyResponse(groupId, key, response);
}

/** What changed in a group, so local edits trigger a push without syncing on every render. */
function fingerprint(groupId: string) {
  const s = useStore.getState();
  const group = s.groups.find((g) => g.id === groupId);
  let latest = group?.updatedAt ?? 0;
  let count = 0;
  for (const e of s.expenses) {
    if (e.groupId !== groupId) continue;
    count++;
    latest = Math.max(latest, e.updatedAt);
  }
  for (const t of Object.values(s.tombstones)) {
    if (t.groupId === groupId) latest = Math.max(latest, t.deletedAt);
  }
  return `${latest}:${count}`;
}

const quietly = (p: Promise<void>) => p.catch(() => {}); // offline: try again on the next round

/** Keeps every shared group in sync: after local edits, on a timer, and when the app comes back. */
export function startSync() {
  if (!syncEnabled) return () => {};
  const seen = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const syncAll = () => {
    for (const id of Object.keys(useStore.getState().shares)) {
      quietly(syncGroup(id).then(() => void seen.set(id, fingerprint(id))));
    }
  };

  const unsubscribe = useStore.subscribe((s) => {
    for (const id of Object.keys(s.shares)) {
      const now = fingerprint(id);
      if (seen.get(id) === now) continue;
      seen.set(id, now);
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(() => quietly(syncGroup(id)), DEBOUNCE_MS),
      );
    }
  });
  const appState = AppState.addEventListener('change', (state) => state === 'active' && syncAll());
  const interval = setInterval(syncAll, POLL_MS);
  syncAll();

  return () => {
    unsubscribe();
    appState.remove();
    clearInterval(interval);
    timers.forEach(clearTimeout);
  };
}
