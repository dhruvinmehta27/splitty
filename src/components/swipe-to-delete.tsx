import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Negative } from '@/components/net-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * Swipe the row left to reveal a red button; the caller confirms before deleting.
 * onDelete resolves true if the row was deleted, otherwise the row slides back.
 */
export function SwipeToDelete({
  children,
  label = 'Delete',
  onDelete,
}: {
  children: ReactNode;
  label?: string;
  onDelete: () => Promise<boolean>;
}) {
  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, swipeable) => (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          onPress={async () => {
            // Closing a row that is being deleted animates an unmounted gesture handler.
            if (!(await onDelete())) swipeable.close();
          }}>
          <ThemedText type="smallBold" style={styles.label}>
            {label}
          </ThemedText>
        </Pressable>
      )}>
      {/* Opaque so the red action stays hidden until the row slides away. */}
      <ThemedView>{children}</ThemedView>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 96,
    backgroundColor: Negative,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  label: { color: '#fff' },
});
