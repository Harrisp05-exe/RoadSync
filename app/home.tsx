import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Your road ahead</Text>
            <Text style={styles.brand}>RoadSync</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroGreeting}>Good morning, Maya</Text>
            <Text style={styles.heroTitle}>Ready for the next mile?</Text>
            <Text style={styles.heroSubtitle}>
              Plan the route, keep your crew updated, and move together with
              confidence.
            </Text>
          </View>
          <Image
            source={require("../assets/images/welcome_image.png")}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.tripCard}>
          <Text style={styles.tripLabel}>Active trip</Text>
          <Text style={styles.emptyStateText}>No active trips</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/create-trip")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Create trip</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/join-trip")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Join trip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#edf2fb",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: "#edf2fb",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: {
    color: "#5f6b8a",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  brand: {
    color: "#102d63",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#102d63",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f7f9ff",
    borderRadius: 22,
    padding: 18,
    minHeight: 180,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e1e8f7",
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },
  heroGreeting: {
    color: "#4a5d8a",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#102d63",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "#495c7d",
    fontSize: 14,
    lineHeight: 20,
  },
  heroImage: {
    width: 110,
    height: 110,
    borderRadius: 16,
  },
  tripCard: {
    backgroundColor: "#f8faff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e3eafc",
  },
  tripLabel: {
    color: "#4f618d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  emptyStateText: {
    color: "#4a5d8a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 18,
  },
  actions: {
    gap: 12,
    marginTop: "auto",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#102d63",
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f6ff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#102d63",
    fontSize: 16,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.8,
  },
});
