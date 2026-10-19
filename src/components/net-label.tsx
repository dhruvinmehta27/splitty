import { ThemedText } from '@/components/themed-text';
import { formatMoney } from '@/lib/store';

export function NetLabel({ cents, currency }: { cents: number; currency: string }) {
  if (cents === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        settled
      </ThemedText>
    );
  }
  return (
    <ThemedText type="smallBold" style={{ color: cents > 0 ? Positive : Negative }}>
      {cents > 0 ? 'owed ' : 'owes '}
      {formatMoney(Math.abs(cents), currency)}
    </ThemedText>
  );
}

export const Positive = '#1A9E6B';
export const Negative = '#E2553D';
