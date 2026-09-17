import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { joinTrip } from "@/app-data/roadsync";
import { ActionButton } from "@/components/roadsync/action-button";
import { RoadSyncScreen, Section } from "@/components/roadsync/screen";
import { auth } from "@/firebase-config";

export default function JoinTripScreen() {
  const [travelerName, setTravelerName] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadUserName = async () => {
      const savedName = await AsyncStorage.getItem("roadsync.user.username");
      if (savedName?.trim()) {
        setTravelerName(savedName.trim());
      } else if (auth.currentUser?.displayName?.trim()) {
        setTravelerName(auth.currentUser.displayName.trim());
      }
    };
    void loadUserName();
  }, []);

  const handleJoinTrip = async () => {
    setErrorMessage("");
    const trimmedCode = tripCode.trim().toUpperCase();
    const resolvedName =
      travelerName.trim() ||
      auth.currentUser?.displayName?.trim() ||
      "Traveler";

    if (!trimmedCode) {
      setErrorMessage("Please enter the 6-character trip code.");
      return;
    }

    const result = await joinTrip(trimmedCode, resolvedName);

    if (result.error || !result.trip || !result.participant) {
      setErrorMessage(result.error ?? "Unable to join the trip right now.");
      return;
    }

    await AsyncStorage.setItem(
      "roadsync.lastTrip",
      JSON.stringify({
        id: result.trip.id,
        tripCode: result.trip.tripCode,
        participantId: result.participant.id,
        isHost: false,
        name: result.trip.name,
        nextStop: result.trip.nextStop,
      }),
    );

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
          Enter your name and the 6-character host code to join the shared
          route.
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
            autoCapitalize="characters"
            maxLength={6}
            placeholder="AB12CD"
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
