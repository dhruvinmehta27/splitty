import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backupFileName, makeBackup, mergeBackup, parseBackup } from '@/lib/backup';
import { pickBackupFile, saveBackupFile } from '@/lib/backup-file';
import { inform } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { parseShareLink, syncEnabled } from '@/lib/sync';

export default function SettingsScreen() {
  const groups = useStore((s) => s.groups);
  const expenses = useStore((s) => s.expenses);
  const replaceAll = useStore((s) => s.replaceAll);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const theme = useTheme();

  function join() {
    const parsed = parseShareLink(link);
    if (!parsed) {
      inform('Not a group link', 'Paste the whole link your friend sent you.');
      return;
    }
    setLink('');
    router.push({ pathname: '/join/[id]', params: { id: parsed.groupId, key: parsed.key } });
  }

  async function exportBackup() {
    setBusy(true);
    try {
      await saveBackupFile(backupFileName(), makeBackup(groups, expenses));
    } catch (e) {
      inform('Export failed', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function importBackup() {
    setBusy(true);
    try {
      const text = await pickBackupFile();
      if (text === null) return;
      const state = useStore.getState();
      const merged = mergeBackup(state, parseBackup(text));
      replaceAll(merged.groups, merged.expenses);
      const { groups: g, expenses: e } = merged.added;
      inform(
        'Backup imported',
        g + e === 0
          ? 'Everything in this backup is already here.'
          : `Added ${g} group${g === 1 ? '' : 's'} and ${e} expense${e === 1 ? '' : 's'}.`,
      );
    } catch (e) {
      inform('Import failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic">
          <ThemedText type="subtitle">Settings</ThemedText>
          {syncEnabled && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Join a shared group</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                placeholder="Paste the link a friend sent"
                placeholderTextColor={theme.textSecondary}
                value={link}
                onChangeText={setLink}
                onSubmitEditing={join}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
              />
              <Button label="Join" onPress={join} disabled={!link.trim()} />
            </ThemedView>
          )}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Backup</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {syncEnabled
                ? 'Groups you share are also kept on the server. '
                : 'Your data is stored only on this device. '}
              Export a backup file to keep it safe or move it to another phone or browser. Importing
              adds what&apos;s missing and never deletes anything.
            </ThemedText>
            <Button label="Export backup" onPress={exportBackup} disabled={busy} />
            <Button label="Import backup" onPress={importBackup} disabled={busy} secondary />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Button({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || pressed) && styles.dim,
      ]}>
      <ThemedText style={[styles.buttonText, secondary && { color: Positive }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.two },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Spacing.two,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  button: {
    backgroundColor: Positive,
    borderRadius: Spacing.two,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Positive },
  buttonText: { color: '#fff', fontWeight: 700 },
  dim: { opacity: 0.6 },
});
