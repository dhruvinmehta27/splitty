import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteButton, EditToggle } from '@/components/delete-button';
import { Negative, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { owedTo } from '@/lib/split';
import { confirmDestructive, inform } from '@/lib/confirm';
import { formatMoney, isInvolved, useStore } from '@/lib/store';

type Friend = {
  key: string;
  name: string;
  groups: string[];
  memberships: { groupId: string; memberId: string }[];
  expenseCount: number;
  owed: Record<string, number>;
};

export default function FriendsScreen() {
  const groups = useStore((s) => s.groups);
  const expenses = useStore((s) => s.expenses);
  const removeMember = useStore((s) => s.removeMember);
  const [editing, setEditing] = useState(false);

  // Members are per group, so the same friend in two groups is matched by name.
  // The first member of every group is you.
  const friends = useMemo(() => {
    const byName = new Map<string, Friend>();
    for (const g of groups) {
      const me = g.members[0]?.id;
      const groupExpenses = expenses.filter((e) => e.groupId === g.id);
      const owed = owedTo(me, groupExpenses);
      for (const m of g.members.slice(1)) {
        const key = m.name.trim().toLowerCase();
        const f = byName.get(key) ?? {
          key,
          name: m.name,
          groups: [],
          memberships: [],
          expenseCount: 0,
          owed: {},
        };
        f.groups.push(g.name);
        f.memberships.push({ groupId: g.id, memberId: m.id });
        f.expenseCount += groupExpenses.filter((e) => isInvolved(m.id, [e])).length;
        f.owed[g.currency] = (f.owed[g.currency] ?? 0) + (owed[m.id] ?? 0);
        byName.set(key, f);
      }
    }
    const total = (f: Friend) => Object.values(f.owed).reduce((a, c) => a + Math.abs(c), 0);
    return [...byName.values()].sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name));
  }, [groups, expenses]);

  async function remove(f: Friend) {
    if (f.expenseCount > 0) {
      inform(
        `Can't remove ${f.name} yet`,
        `${f.name} is part of ${f.expenseCount} expense${f.expenseCount === 1 ? '' : 's'}. Delete those first (Edit inside the group), then remove them here.`,
      );
      return;
    }
    const where = f.groups.length === 1 ? `"${f.groups[0]}"` : `${f.groups.length} groups`;
    if (
      await confirmDestructive(
        `Remove ${f.name}?`,
        `${f.name} will be removed from ${where}.`,
        'Remove',
      )
    ) {
      for (const { groupId, memberId } of f.memberships) removeMember(groupId, memberId);
      if (friends.length === 1) setEditing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          data={friends}
          keyExtractor={(f) => f.key}
          ListHeaderComponent={
            <View style={styles.titleRow}>
              <ThemedText type="subtitle">Friends</ThemedText>
              {friends.length > 0 && (
                <EditToggle editing={editing} onPress={() => setEditing((e) => !e)} />
              )}
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Friends you add to groups show up here
            </ThemedText>
          }
          renderItem={({ item }) => {
            const amounts = Object.entries(item.owed).filter(([, c]) => c !== 0);
            return (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <ThemedText>{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.groups.join(', ')}
                  </ThemedText>
                </View>
                <View style={styles.amounts}>
                  {editing ? (
                    <DeleteButton label="Remove" onPress={() => remove(item)} />
                  ) : amounts.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      settled up
                    </ThemedText>
                  ) : (
                    amounts.map(([currency, c]) => (
                      <ThemedText
                        key={currency}
                        type="smallBold"
                        style={{ color: c > 0 ? Positive : Negative }}>
                        {c > 0 ? 'owes you ' : 'you owe '}
                        {formatMoney(Math.abs(c), currency)}
                      </ThemedText>
                    ))
                  )}
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, alignItems: 'center' },
  list: { width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amounts: { alignItems: 'flex-end' },
});
