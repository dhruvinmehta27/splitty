import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Negative, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { joinGroup, syncEnabled } from '@/lib/sync';

/** Opened from a share link: /join/<group id>#<key> on the web, or with a key param in the app. */
export default function JoinScreen() {
  const params = useLocalSearchParams<{ id: string; key?: string }>();
  const groupId = params.id;
  const key = params.key ?? (Platform.OS === 'web' ? window.location.hash.slice(1) : '');
  const group = useStore((s) => s.groups.find((g) => g.id === groupId));
  const alreadyJoined = useStore((s) => Boolean(s.shares[groupId]));
  const setMe = useStore((s) => s.setMe);
  const addMember = useStore((s) => s.addMember);
  const theme = useTheme();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alreadyJoined || !syncEnabled || !key) return;
    joinGroup(groupId, key).catch((e: Error) => setError(e.message));
  }, [groupId, key, alreadyJoined]);

  function choose(memberId: string) {
    setMe(groupId, memberId);
    router.replace({ pathname: '/group/[id]', params: { id: groupId } });
  }

  let body;
  if (!syncEnabled) {
    body = <Message text="This copy of Splitty can't open shared groups." />;
  } else if (!key && !alreadyJoined) {
    body = <Message text="This link is incomplete. Ask for the link again." error />;
  } else if (error) {
    body = <Message text={error} error />;
  } else if (!group) {
    body = <Message text="Opening the group…" />;
  } else {
    body = (
      <>
        <ThemedText type="subtitle">{group.name}</ThemedText>
        <ThemedText type="smallBold">Which one are you?</ThemedText>
        {group.members.map((m) => (
          <Pressable key={m.id} onPress={() => choose(m.id)}>
            {({ pressed }) => (
              <ThemedView
                type={pressed ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.member}>
                <ThemedText>{m.name}</ThemedText>
              </ThemedView>
            )}
          </Pressable>
        ))}
        <ThemedText type="small" themeColor="textSecondary">
          Not listed? Add yourself:
        </ThemedText>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={() => newName.trim() && choose(addMember(groupId, newName.trim()))}
            returnKeyType="done"
          />
          <Pressable
            disabled={!newName.trim()}
            onPress={() => choose(addMember(groupId, newName.trim()))}
            style={({ pressed }) => [styles.add, (!newName.trim() || pressed) && styles.dim]}>
            <ThemedText style={styles.addText}>Join</ThemedText>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {body}
      </ScrollView>
    </ThemedView>
  );
}

function Message({ text, error }: { text: string; error?: boolean }) {
  return (
    <ThemedText
      type="small"
      themeColor="textSecondary"
      style={[styles.message, error && { color: Negative }]}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.three },
  member: { padding: Spacing.three, borderRadius: Spacing.two },
  message: { textAlign: 'center', marginTop: Spacing.four },
  row: { flexDirection: 'row', gap: Spacing.two },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Spacing.two,
  },
  add: {
    backgroundColor: Positive,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontWeight: 700 },
  dim: { opacity: 0.6 },
});
