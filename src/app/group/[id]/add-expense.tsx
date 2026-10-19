import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Negative, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeSplit, parseCents, type SplitMode } from '@/lib/split';
import { formatMoney, useStore } from '@/lib/store';

const MODES: { mode: SplitMode; label: string }[] = [
  { mode: 'equal', label: 'Equally' },
  { mode: 'exact', label: 'Amounts' },
  { mode: 'percent', label: '%' },
  { mode: 'shares', label: 'Shares' },
];

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useStore((s) => s.groups.find((g) => g.id === id));
  const addExpense = useStore((s) => s.addExpense);
  const theme = useTheme();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState(group?.members[0]?.id ?? '');
  const [mode, setMode] = useState<SplitMode>('equal');
  // One input map per mode, so switching modes doesn't lose what was typed.
  const [inputs, setInputs] = useState<Record<SplitMode, Record<string, string>>>({
    equal: {},
    exact: {},
    percent: {},
    shares: {},
  });

  if (!group) return <ThemedView style={styles.container} />;

  const memberIds = group.members.map((m) => m.id);
  const total = parseCents(amount) ?? 0;
  const result = computeSplit(mode, total, memberIds, inputs[mode]);
  const canSave = result.ok;

  function setInput(memberId: string, value: string) {
    setInputs((prev) => ({ ...prev, [mode]: { ...prev[mode], [memberId]: value } }));
  }

  function save() {
    if (!result.ok || !canSave) return;
    addExpense({
      groupId: group!.id,
      description: description.trim() || 'Expense',
      amountCents: total,
      paidBy,
      mode,
      shares: result.shares,
    });
    router.back();
  }

  const inputStyle = { color: theme.text, backgroundColor: theme.backgroundElement };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled">
        <TextInput
          style={[styles.amount, { color: theme.text }]}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          autoFocus
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder="What was it for? (optional)"
          placeholderTextColor={theme.textSecondary}
          value={description}
          onChangeText={setDescription}
          onSubmitEditing={save}
          returnKeyType="done"
        />

        <ThemedText type="smallBold">Paid by</ThemedText>
        <View style={styles.chips}>
          {group.members.map((m) => (
            <Chip key={m.id} label={m.name} active={paidBy === m.id} onPress={() => setPaidBy(m.id)} />
          ))}
        </View>

        <ThemedText type="smallBold">Split</ThemedText>
        <View style={styles.chips}>
          {MODES.map((m) => (
            <Chip key={m.mode} label={m.label} active={mode === m.mode} onPress={() => setMode(m.mode)} />
          ))}
        </View>

        {group.members.map((m) => {
          const share = result.ok ? (result.shares[m.id] ?? 0) : null;
          const included = inputs.equal[m.id] !== 'off';
          return (
            <View key={m.id} style={styles.memberRow}>
              {mode === 'equal' ? (
                <Pressable
                  style={styles.flex}
                  onPress={() => setInput(m.id, included ? 'off' : '')}
                  hitSlop={8}>
                  <ThemedText themeColor={included ? 'text' : 'textSecondary'}>
                    {included ? '✓ ' : '○ '}
                    {m.name}
                  </ThemedText>
                </Pressable>
              ) : (
                <>
                  <ThemedText style={styles.flex}>{m.name}</ThemedText>
                  <TextInput
                    style={[styles.input, styles.smallInput, inputStyle]}
                    placeholder={mode === 'exact' ? '0.00' : mode === 'percent' ? '0 %' : '0'}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    value={inputs[mode][m.id] ?? ''}
                    onChangeText={(v) => setInput(m.id, v)}
                  />
                </>
              )}
              <ThemedText type="small" themeColor="textSecondary" style={styles.share}>
                {share === null ? '' : formatMoney(share, group.currency)}
              </ThemedText>
            </View>
          );
        })}

        {!result.ok && total > 0 && (
          <ThemedText type="small" style={{ color: Negative }}>
            {result.error}
          </ThemedText>
        )}

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [styles.save, (!canSave || pressed) && styles.dim]}>
          <ThemedText style={styles.saveText}>Save</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView type={active ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
        <ThemedText type={active ? 'smallBold' : 'small'} themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.three },
  amount: { fontSize: 44, fontWeight: 700, textAlign: 'center', paddingVertical: Spacing.two },
  input: { fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: 12, borderRadius: Spacing.two },
  smallInput: { width: 96, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  flex: { flex: 1 },
  share: { width: 88, textAlign: 'right' },
  save: { backgroundColor: Positive, borderRadius: Spacing.two, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 700 },
  dim: { opacity: 0.6 },
});
