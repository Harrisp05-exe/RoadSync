import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { createTrip } from "@/app-data/roadsync";
import { ActionButton } from "@/components/roadsync/action-button";
import { RoadSyncScreen, Section } from "@/components/roadsync/screen";

export default function CreateTripScreen() {
  const [tripName, setTripName] = useState("");
  const [hostName, setHostName] = useState("");
  const [mapsLink, setMapsLink] = useState("");

  const handleCreateTrip = () => {
    const trip = createTrip({
      name: tripName,
      hostName,
      mapUrl: mapsLink,
    });

    router.push({
      pathname: "/trip/[id]",
      params: {
        id: trip.id,
        tripCode: trip.tripCode,
        participantId: trip.participants[0]?.id,
        isHost: "true",
        name: trip.name,
      },
    });
  };

  return (
    <RoadSyncScreen>
      <Section>
        <Text style={styles.title}>Create a trip</Text>
        <Text style={styles.subtitle}>
          Start a shared trip, drop in your route, and invite everyone with a
          5-digit code.
        </Text>
      </Section>

      <Section style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Trip name</Text>
          <TextInput
            value={tripName}
            onChangeText={setTripName}
            placeholder="Weekend getaway"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={hostName}
            onChangeText={setHostName}
            placeholder="Maya"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Google Maps link</Text>
          <TextInput
            value={mapsLink}
            onChangeText={setMapsLink}
            multiline
            placeholder="Paste a Google Maps link for the route or destination"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.textArea]}
          />
        </View>
      </Section>

      <View style={styles.actions}>
        <ActionButton
          label="Create trip"
          icon="add-road"
          onPress={handleCreateTrip}
        />
        <ActionButton
          label="Cancel"
          icon="close"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    </RoadSyncScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#0f172a",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
  input: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#0f172a",
    fontSize: 16,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  actions: {
    gap: 12,
  },
});
