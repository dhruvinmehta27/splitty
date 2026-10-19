import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, TextInput } from 'react-native';

import { Negative, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { meIn, useStore } from '@/lib/store';
import { newShareKey, shareLink, syncEnabled, syncGroup } from '@/lib/sync';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useStore((s) => s.groups.find((g) => g.id === id));
  const share = useStore((s) => s.shares[id]);
  const me = useStore((s) => s.me);
  const renameMember = useStore((s) => s.renameMember);
  const setShare = useStore((s) => s.setShare);
  const theme = useTheme();

  const myId = group ? meIn(group, me) : '';
  const myName = group?.members.find((m) => m.id === myId)?.name ?? '';
  // "You" means nothing on a friend's phone, so ask for a real name before sharing.
  const [name, setName] = useState(myName === 'You' ? '' : myName);
  const [status, setStatus] = useState<{ error?: string; copied?: boolean }>({});
  const [busy, setBusy] = useState(false);

  if (!group) return <ThemedView style={styles.container} />;

  if (!syncEnabled) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Sharing needs the hosted version of Splitty with a sync server. This copy keeps data on
          this device only.
        </ThemedText>
      </ThemedView>
    );
  }

  const link = share ? shareLink(group.id, share.key) : null;

  async function createLink() {
    if (!name.trim()) return;
    setBusy(true);
    setStatus({});
    try {
      if (name.trim() !== myName) renameMember(group!.id, myId, name.trim());
      setShare(group!.id, { key: newShareKey(), lastSync: 0 });
      await syncGroup(group!.id);
    } catch (e) {
      // Without a server copy the link would be useless, so take the share back.
      useStore.setState((s) => {
        const { [group!.id]: _removed, ...shares } = s.shares;
        return { shares };
      });
      setStatus({ error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function sendLink() {
    if (!link) return;
    const message = `Join "${group!.name}" on Splitty: ${link}`;
    if (Platform.OS === 'web' && !navigator.share) {
      await navigator.clipboard.writeText(link);
      setStatus({ copied: true });
      return;
    }
    await Share.share({ message });
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!link ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Anyone with the link can see and edit &quot;{group.name}&quot;. Send it only to the
              people in this group.
            </ThemedText>
            <ThemedText type="smallBold">Your name in this group</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              placeholder="e.g. Dhruvin"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              onSubmitEditing={createLink}
              autoFocus
              returnKeyType="done"
            />
            <Button
              label={busy ? 'Creating link…' : 'Create link'}
              onPress={createLink}
              disabled={busy || !name.trim()}
            />
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              This group is shared. Changes sync automatically for everyone who opened the link.
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.linkBox}>
              <ThemedText type="small" selectable>
                {link}
              </ThemedText>
            </ThemedView>
            <Button
              label={status.copied ? 'Link copied' : 'Send link'}
              onPress={sendLink}
              disabled={false}
            />
          </>
        )}
        {status.error && (
          <ThemedText type="small" style={{ color: Negative }}>
            {status.error}
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Button({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, (disabled || pressed) && styles.dim]}>
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.three },
  note: { padding: Spacing.four, textAlign: 'center' },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Spacing.two,
  },
  linkBox: { padding: Spacing.three, borderRadius: Spacing.two },
  button: {
    backgroundColor: Positive,
    borderRadius: Spacing.two,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 700 },
  dim: { opacity: 0.6 },
});
