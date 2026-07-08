import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { activeTrip } from "@/app-data/roadsync";

export default function HomeScreen() {
  const openActiveTrip = () => {
    router.push({
      pathname: "/trip/[id]",
      params: {
        id: activeTrip.id,
        inviteCode: activeTrip.inviteCode,
        name: activeTrip.name,
        origin: activeTrip.origin,
        destination: activeTrip.destination,
        startTime: activeTrip.startTime,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🚗</Text>
        <Text style={styles.title}>RoadSync</Text>
        <Text style={styles.subtitle}>
          Plan, share, and track every road trip from one place.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Active trip</Text>
        <Text style={styles.cardTitle}>{activeTrip.name}</Text>
        <Text style={styles.cardMeta}>
          {activeTrip.origin} → {activeTrip.destination}
        </Text>
        <Text style={styles.cardStatus}>{activeTrip.safetyStatus}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={openActiveTrip}>
          <Text style={styles.buttonText}>Open active trip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/create-trip")}
        >
          <Text style={styles.buttonText}>Create a new trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push("/join-trip")}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Join an existing trip
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
    gap: 16,
  },
  hero: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    fontSize: 70,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
    color: "#0f766e",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
    padding: 18,
    gap: 8,
  },
  cardLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800",
  },
  cardMeta: {
    color: "#475569",
    fontSize: 15,
  },
  cardStatus: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    gap: 10,
  },
  button: {
    width: "100%",
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 12,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#0f766e",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#0f172a",
  },
});
