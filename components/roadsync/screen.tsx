import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
    type ViewProps,
} from "react-native";

export function RoadSyncScreen({ children, style }: ViewProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, style]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Section({ children, style }: ViewProps) {
  return <View style={[styles.section, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flexGrow: 1,
    gap: 20,
    padding: 20,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
  },
  section: {
    gap: 12,
  },
});
