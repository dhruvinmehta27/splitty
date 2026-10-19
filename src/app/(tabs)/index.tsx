import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NetLabel, Positive } from "@/components/net-label";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useStore } from "@/lib/store";
import { balances } from "@/lib/split";

export default function GroupsScreen() {
  const groups = useStore((s) => s.groups);
  const expenses = useStore((s) => s.expenses);
  const addGroup = useStore((s) => s.addGroup);
  const theme = useTheme();
  const [name, setName] = useState("");
  const [friend, setFriend] = useState("");
  const [friends, setFriends] = useState<string[]>([]);

  const canAddFriend = friend.trim() !== "";
  const canCreate = name.trim() !== "" && friends.length > 0;

  function addFriend() {
    if (!canAddFriend) return;
    setFriends((f) => [...f, friend.trim()]);
    setFriend("");
  }

  function create() {
    if (!canCreate) return;
    addGroup(name.trim(), ["You", ...friends]);
    setName("");
    setFriends([]);
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.background },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          data={groups}
          keyExtractor={(g) => g.id}
          ListHeaderComponent={
            <>
              <ThemedText type="subtitle">Groups</ThemedText>
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
                <View style={styles.friendRow}>
                  <TextInput
                    style={[inputStyle, styles.flex]}
                    placeholder="Add a friend"
                    placeholderTextColor={theme.textSecondary}
                    value={friend}
                    onChangeText={setFriend}
                    onSubmitEditing={addFriend}
                    submitBehavior="submit"
                    returnKeyType="next"
                  />
                  <Pressable
                    onPress={addFriend}
                    disabled={!canAddFriend}
                    accessibilityLabel="Add friend"
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.plus,
                      (!canAddFriend || pressed) && styles.dim,
                    ]}
                  >
                    <ThemedText style={styles.plusText}>+</ThemedText>
                  </Pressable>
                </View>
                {friends.length > 0 && (
                  <View style={styles.chips}>
                    {friends.map((f, i) => (
                      <Pressable
                        key={i}
                        onPress={() =>
                          setFriends((all) => all.filter((_, j) => j !== i))
                        }
                        accessibilityLabel={`Remove ${f}`}
                      >
                        <ThemedView style={styles.chip}>
                          <ThemedText type="small">{f} ×</ThemedText>
                        </ThemedView>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Pressable
                  onPress={create}
                  disabled={!canCreate}
                  style={({ pressed }) => [
                    styles.button,
                    (!canCreate || pressed) && styles.dim,
                  ]}
                >
                  <ThemedText style={styles.buttonText}>Create</ThemedText>
                </Pressable>
              </ThemedView>
            </>
          }
          renderItem={({ item }) => {
            const you = item.members[0]?.id;
            const net =
              balances(expenses.filter((e) => e.groupId === item.id))[you] ?? 0;
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/group/[id]",
                    params: { id: item.id },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.dim]}
              >
                <View style={styles.rowText}>
                  <ThemedText>{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.members.map((m) => m.name).join(", ")}
                  </ThemedText>
                </View>
                <NetLabel cents={net} currency={item.currency} />
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, alignItems: "center" },
  list: { width: "100%", maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.two },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Spacing.two,
  },
  button: {
    backgroundColor: Positive,
    borderRadius: Spacing.two,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: 700 },
  dim: { opacity: 0.6 },
  flex: { flex: 1 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Positive,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: { color: "#fff", fontSize: 26, lineHeight: 28, fontWeight: 600 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  rowText: { flex: 1 },
});
