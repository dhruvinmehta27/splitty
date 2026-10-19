import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList style={styles.tabList}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton>Groups</TabButton>
        </TabTrigger>
        <TabTrigger name="friends" href="/friends" asChild>
          <TabButton>Friends</TabButton>
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild>
          <TabButton>Settings</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

// The slot's ref type doesn't match Pressable's, and the button doesn't need it.
function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButton}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabList: {
    position: 'absolute',
    bottom: Spacing.three,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  tabButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
  },
  pressed: { opacity: 0.7 },
});
