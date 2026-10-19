import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteButton, EditToggle, HeaderButton } from '@/components/delete-button';
import { NetLabel, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { balances } from '@/lib/split';
import { confirmDestructive, inform } from '@/lib/confirm';
import { syncEnabled } from '@/lib/sync';
import { formatMoney, isInvolved, meIn, useStore, type Expense, type Member } from '@/lib/store';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useStore((s) => s.groups.find((g) => g.id === id));
  const allExpenses = useStore((s) => s.expenses);
  const me = useStore((s) => s.me);
  const shared = useStore((s) => Boolean(s.shares[id]));
  const addMember = useStore((s) => s.addMember);
  const removeMember = useStore((s) => s.removeMember);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const [editing, setEditing] = useState(false);
  const theme = useTheme();
  const [newMember, setNewMember] = useState('');

  const expenses = useMemo(() => allExpenses.filter((e) => e.groupId === id), [allExpenses, id]);
  const net = useMemo(() => balances(expenses), [expenses]);

  if (!group) return <ThemedView style={styles.container} />;

  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';

  async function removeExpense(e: Expense) {
    const amount = formatMoney(e.amountCents, group!.currency);
    if (
      await confirmDestructive(
        `Delete "${e.description}"?`,
        `${amount}, paid by ${nameOf(e.paidBy)}.`,
      )
    ) {
      deleteExpense(e.id);
    }
  }

  async function remove(m: Member) {
    const count = expenses.filter((e) => isInvolved(m.id, [e])).length;
    if (count > 0) {
      inform(
        `Can't remove ${m.name} yet`,
        `${m.name} is part of ${count} expense${count === 1 ? '' : 's'} here. Delete those first.`,
      );
      return;
    }
    if (await confirmDestructive(`Remove ${m.name}?`, `From "${group!.name}".`, 'Remove')) {
      removeMember(group!.id, m.id);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: group.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              {syncEnabled && (
                <HeaderButton
                  label={shared ? 'Shared' : 'Share'}
                  onPress={() =>
                    router.push({ pathname: '/group/[id]/share', params: { id: group.id } })
                  }
                />
              )}
              <EditToggle editing={editing} onPress={() => setEditing((e) => !e)} />
            </View>
          ),
        }}
      />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={expenses}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <ThemedView type="backgroundElement" style={styles.card}>
            {group.members.map((m, i) => (
              <View key={m.id} style={styles.balanceRow}>
                <ThemedText style={styles.flex}>{m.name}</ThemedText>
                {editing && m.id !== meIn(group, me) ? (
                  <DeleteButton label="Remove" onPress={() => remove(m)} />
                ) : (
                  <NetLabel cents={net[m.id] ?? 0} currency={group.currency} />
                )}
              </View>
            ))}
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              placeholder="+ Add person"
              placeholderTextColor={theme.textSecondary}
              value={newMember}
              onChangeText={setNewMember}
              onSubmitEditing={() => {
                if (newMember.trim()) addMember(group.id, newMember.trim());
                setNewMember('');
              }}
              returnKeyType="done"
            />
          </ThemedView>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No expenses yet
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View style={styles.expenseRow}>
            <View style={styles.flex}>
              <ThemedText>{item.description}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {nameOf(item.paidBy)} paid · {new Date(item.createdAt).toLocaleDateString()}
              </ThemedText>
            </View>
            {editing ? (
              <DeleteButton onPress={() => removeExpense(item)} />
            ) : (
              <ThemedText type="smallBold">
                {formatMoney(item.amountCents, group.currency)}
              </ThemedText>
            )}
          </View>
        )}
      />
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/group/[id]/add-expense', params: { id: group.id } })
          }
          style={({ pressed }) => [styles.addButton, pressed && styles.dim]}>
          <ThemedText style={styles.addText}>Add expense</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  list: { width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.one, paddingBottom: 96 },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  balanceRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: Spacing.two,
  },
  flex: { flex: 1 },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  footer: { position: 'absolute', bottom: Spacing.three, alignSelf: 'center' },
  addButton: {
    backgroundColor: Positive,
    borderRadius: 999,
    paddingHorizontal: Spacing.five,
    paddingVertical: 14,
  },
  addText: { color: '#fff', fontWeight: 700 },
  dim: { opacity: 0.6 },
});
