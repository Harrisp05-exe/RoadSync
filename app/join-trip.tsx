import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { joinTrip } from "@/app-data/roadsync";
import { ActionButton } from "@/components/roadsync/action-button";
import { RoadSyncScreen, Section } from "@/components/roadsync/screen";

export default function JoinTripScreen() {
  const [travelerName, setTravelerName] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleJoinTrip = async () => {
    const result = await joinTrip(tripCode, travelerName);

    if (result.error || !result.trip || !result.participant) {
      setErrorMessage(result.error ?? "Unable to join the trip right now.");
      return;
    }

    router.push({
      pathname: "/trip/[id]",
      params: {
        id: result.trip.id,
        tripCode: result.trip.tripCode,
        participantId: result.participant.id,
        isHost: "false",
        name: result.trip.name,
      },
    });
  };

  return (
    <RoadSyncScreen>
      <Section>
        <Text style={styles.title}>Join a trip</Text>
        <Text style={styles.subtitle}>
          Enter your name and the 5-digit host code to join the shared route.
        </Text>
      </Section>

      <Section style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={travelerName}
            onChangeText={setTravelerName}
            placeholder="Taylor"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Trip code</Text>
          <TextInput
            value={tripCode}
            onChangeText={setTripCode}
            keyboardType="number-pad"
            maxLength={5}
            placeholder="48213"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </Section>

      <View style={styles.actions}>
        <ActionButton
          label="Join trip"
          icon="group-add"
          onPress={handleJoinTrip}
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
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
    paddingHorizontal: 14,
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
});
