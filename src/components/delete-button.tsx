import { Platform, Pressable, StyleSheet } from 'react-native';

import { Negative, Positive } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function DeleteButton({
  label = 'Delete',
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={styles.text}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function EditToggle({ editing, onPress }: { editing: boolean; onPress: () => void }) {
  return <HeaderButton label={editing ? 'Done' : 'Edit'} onPress={onPress} />;
}

export function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" style={styles.toggle}>
      <ThemedText type="smallBold" style={{ color: Positive }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Negative,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  text: { color: '#fff' },
  pressed: { opacity: 0.6 },
  // Native headers pad their buttons; the web header doesn't.
  toggle: { paddingHorizontal: Platform.OS === 'web' ? Spacing.three : 0 },
});
