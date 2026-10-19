import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { NetLabel, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { balances } from '@/lib/split';

export default function GroupsScreen() {
  const groups = useStore((s) => s.groups);
  const expenses = useStore((s) => s.expenses);
  const addGroup = useStore((s) => s.addGroup);
  const theme = useTheme();
  const [name, setName] = useState('');
  const [members, setMembers] = useState('');

  const memberNames = ['You', ...members.split(',').map((m) => m.trim()).filter(Boolean)];
  const canCreate = name.trim() !== '' && memberNames.length > 1;

  function create() {
    if (!canCreate) return;
    addGroup(name.trim(), memberNames);
    setName('');
    setMembers('');
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];

  return (
    <ThemedView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        data={groups}
        keyExtractor={(g) => g.id}
        ListHeaderComponent={
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">New group</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Name, e.g. Lisbon trip"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
            <TextInput
              style={inputStyle}
              placeholder="Friends, comma separated"
              placeholderTextColor={theme.textSecondary}
              value={members}
              onChangeText={setMembers}
              onSubmitEditing={create}
              returnKeyType="done"
            />
            <Pressable
              onPress={create}
              disabled={!canCreate}
              style={({ pressed }) => [styles.button, (!canCreate || pressed) && styles.dim]}>
              <ThemedText style={styles.buttonText}>Create</ThemedText>
            </Pressable>
          </ThemedView>
        }
        renderItem={({ item }) => {
          const you = item.members[0]?.id;
          const net = balances(expenses.filter((e) => e.groupId === item.id))[you] ?? 0;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.dim]}>
              <View style={styles.rowText}>
                <ThemedText>{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.members.map((m) => m.name).join(', ')}
                </ThemedText>
              </View>
              <NetLabel cents={net} currency={item.currency} />
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  list: { width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, marginBottom: Spacing.two },
  input: { fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: 12, borderRadius: Spacing.two },
  button: {
    backgroundColor: Positive,
    borderRadius: Spacing.two,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 700 },
  dim: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  rowText: { flex: 1 },
});
