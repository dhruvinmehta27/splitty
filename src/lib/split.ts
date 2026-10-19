// All money is in integer cents so splits always add up exactly.

export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares';

export type Shares = Record<string, number>;

export type SplitResult = { ok: true; shares: Shares } | { ok: false; error: string };

/** Parses "12,50" or "12.5" into cents. Returns null for anything that isn't a valid amount. */
export function parseCents(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (!/^\d*(\.\d{0,2})?$/.test(s) || s === '' || s === '.') return null;
  const [whole, frac = ''] = s.split('.');
  return Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'));
}

/**
 * Splits total by weights using the largest-remainder method, so the parts
 * always sum to total and leftover cents go to whoever was rounded down most.
 */
function byWeights(total: number, weights: Record<string, number>): Shares {
  const ids = Object.keys(weights).filter((id) => weights[id] > 0);
  const sum = ids.reduce((a, id) => a + weights[id], 0);
  const shares: Shares = {};
  const remainders: { id: string; r: number }[] = [];
  let given = 0;
  for (const id of ids) {
    const exact = (total * weights[id]) / sum;
    shares[id] = Math.floor(exact);
    given += shares[id];
    remainders.push({ id, r: exact - shares[id] });
  }
  remainders.sort((a, b) => b.r - a.r);
  for (let i = 0; i < total - given; i++) shares[remainders[i].id] += 1;
  return shares;
}

export function computeSplit(
  mode: SplitMode,
  total: number,
  memberIds: string[],
  inputs: Record<string, string>,
): SplitResult {
  if (total <= 0) return { ok: false, error: 'Enter an amount' };

  if (mode === 'equal') {
    const included = memberIds.filter((id) => inputs[id] !== 'off');
    if (included.length === 0) return { ok: false, error: 'Pick at least one person' };
    return { ok: true, shares: byWeights(total, Object.fromEntries(included.map((id) => [id, 1]))) };
  }

  if (mode === 'exact') {
    const shares: Shares = {};
    let sum = 0;
    for (const id of memberIds) {
      const raw = inputs[id]?.trim();
      if (!raw) continue;
      const c = parseCents(raw);
      if (c === null) return { ok: false, error: 'Invalid amount' };
      if (c > 0) shares[id] = c;
      sum += c;
    }
    if (sum !== total) return { ok: false, error: `${formatSigned(total - sum)} left to assign` };
    return { ok: true, shares };
  }

  const weights: Record<string, number> = {};
  for (const id of memberIds) {
    const raw = inputs[id]?.trim().replace(',', '.');
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: 'Invalid number' };
    weights[id] = n;
  }
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (mode === 'percent' && Math.abs(sum - 100) > 1e-9) {
    return { ok: false, error: `${+(100 - sum).toFixed(2)}% left to assign` };
  }
  if (sum <= 0) return { ok: false, error: 'Give someone a share' };
  return { ok: true, shares: byWeights(total, weights) };
}

function formatSigned(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Net balance per member: what they paid minus what they owe. Positive means they are owed. */
export function balances(
  expenses: { paidBy: string; amountCents: number; shares: Shares }[],
): Record<string, number> {
  const net: Record<string, number> = {};
  for (const e of expenses) {
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amountCents;
    for (const [id, c] of Object.entries(e.shares)) net[id] = (net[id] ?? 0) - c;
  }
  return net;
}

/**
 * What each other member owes `me` across these expenses, without simplification:
 * only debts between me and the payer count. Positive means they owe me.
 */
export function owedTo(
  me: string,
  expenses: { paidBy: string; shares: Shares }[],
): Record<string, number> {
  const owed: Record<string, number> = {};
  for (const e of expenses) {
    if (e.paidBy === me) {
      for (const [id, c] of Object.entries(e.shares)) {
        if (id !== me) owed[id] = (owed[id] ?? 0) + c;
      }
    } else if (e.shares[me]) {
      owed[e.paidBy] = (owed[e.paidBy] ?? 0) - e.shares[me];
    }
  }
  return owed;
}
