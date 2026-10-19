import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NetLabel, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { balances } from '@/lib/split';
import { formatMoney, useStore } from '@/lib/store';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useStore((s) => s.groups.find((g) => g.id === id));
  const allExpenses = useStore((s) => s.expenses);
  const addMember = useStore((s) => s.addMember);
  const theme = useTheme();
  const [newMember, setNewMember] = useState('');

  const expenses = useMemo(() => allExpenses.filter((e) => e.groupId === id), [allExpenses, id]);
  const net = useMemo(() => balances(expenses), [expenses]);

  if (!group) return <ThemedView style={styles.container} />;

  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: group.name }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        data={expenses}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <ThemedView type="backgroundElement" style={styles.card}>
            {group.members.map((m) => (
              <View key={m.id} style={styles.balanceRow}>
                <ThemedText style={styles.flex}>{m.name}</ThemedText>
                <NetLabel cents={net[m.id] ?? 0} currency={group.currency} />
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
            <ThemedText type="smallBold">{formatMoney(item.amountCents, group.currency)}</ThemedText>
          </View>
        )}
      />
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          onPress={() => router.push({ pathname: '/group/[id]/add-expense', params: { id: group.id } })}
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
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, marginBottom: Spacing.two },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  input: { fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Spacing.two },
  flex: { flex: 1 },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
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
