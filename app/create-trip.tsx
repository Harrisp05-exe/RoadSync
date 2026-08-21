import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { createMockTrip } from "@/app-data/roadsync";
import { ActionButton } from "@/components/roadsync/action-button";
import { RoadSyncScreen, Section } from "@/components/roadsync/screen";

export default function CreateTripScreen() {
  const [tripName, setTripName] = useState("");
  const [hostName, setHostName] = useState("Current User");
  const [mapsLink, setMapsLink] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("roadsync.user.username").then((savedName) => {
      if (savedName?.trim()) setHostName(savedName.trim());
    });
  }, []);

  const hasDraft = Boolean(
    tripName.trim() || mapsLink.trim() || scheduledDate || scheduledTime,
  );
  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const handlePickerChange = (event: DateTimePickerEvent, value?: Date) => {
    if (event.type === "dismissed") {
      setPickerMode(null);
      return;
    }
    if (value) {
      if (pickerMode === "date") setScheduledDate(value);
      else setScheduledTime(value);
    }
    setPickerMode(null);
  };

  const handleCreateTrip = () => {
    const trimmedName = tripName.trim();
    const trimmedMapsLink = mapsLink.trim();
    if (!trimmedName) {
      setError("Enter a trip name to continue.");
      return;
    }
    if (trimmedMapsLink && !/^https?:\/\/[^\s]+$/i.test(trimmedMapsLink)) {
      setError("Enter a valid Google Maps URL, including https://.");
      return;
    }
    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      setError("Choose a date and time for your scheduled trip.");
      return;
    }
    if (isScheduled && scheduledDate && scheduledTime) {
      const scheduledAt = new Date(scheduledDate);
      scheduledAt.setHours(
        scheduledTime.getHours(),
        scheduledTime.getMinutes(),
        0,
        0,
      );
      if (scheduledAt.getTime() <= Date.now()) {
        setError("Choose a future date and time.");
        return;
      }
    }

    setError("");
    const trip = createMockTrip({
      name: trimmedName,
      hostName,
      mapUrl: trimmedMapsLink,
      isScheduled,
      scheduledDate: scheduledDate?.toISOString() ?? null,
      scheduledTime: scheduledTime?.toISOString() ?? null,
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

  const handleCancel = () => {
    if (hasDraft) setShowDiscardDialog(true);
    else router.back();
  };

  return (
    <RoadSyncScreen>
      <Section>
        <Text style={styles.title}>Create a trip</Text>
        <Text style={styles.subtitle}>
          Start a shared trip, add your route, and invite everyone with a trip
          code.
        </Text>
      </Section>
      <Section style={styles.form}>
        <Text style={styles.sectionTitle}>Trip information</Text>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Trip name</Text>
          <TextInput
            value={tripName}
            onChangeText={setTripName}
            placeholder="Enter trip name"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Trip admin</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{hostName}</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Google Maps link</Text>
          <Text style={styles.description}>
            Add a Google Maps route or destination for this trip.
          </Text>
          <TextInput
            value={mapsLink}
            onChangeText={setMapsLink}
            placeholder="Paste Google Maps link here"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.textArea]}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        <Text style={styles.sectionTitle}>Scheduling</Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isScheduled }}
          onPress={() => setIsScheduled((current) => !current)}
          style={styles.toggleRow}
        >
          <View style={[styles.checkbox, isScheduled && styles.checkboxActive]}>
            {isScheduled ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.toggleLabel}>Schedule this trip for later</Text>
        </Pressable>
        {isScheduled ? (
          <View style={styles.scheduleFields}>
            <View style={styles.scheduleField}>
              <Text style={styles.label}>Trip date</Text>
              <Pressable
                onPress={() => setPickerMode("date")}
                style={styles.pickerButton}
              >
                <Text
                  style={
                    scheduledDate ? styles.pickerText : styles.placeholderText
                  }
                >
                  {scheduledDate ? formatDate(scheduledDate) : "Select date"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.scheduleField}>
              <Text style={styles.label}>Trip time</Text>
              <Pressable
                onPress={() => setPickerMode("time")}
                style={styles.pickerButton}
              >
                <Text
                  style={
                    scheduledTime ? styles.pickerText : styles.placeholderText
                  }
                >
                  {scheduledTime ? formatTime(scheduledTime) : "Select time"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Section>
      <View style={styles.actions}>
        <ActionButton
          label="Create Trip"
          icon="add-road"
          onPress={handleCreateTrip}
          style={styles.actionButton}
        />
        <ActionButton
          label="Cancel"
          icon="close"
          variant="secondary"
          onPress={handleCancel}
          style={styles.actionButton}
        />
      </View>
      {pickerMode ? (
        <DateTimePicker
          value={
            pickerMode === "date"
              ? (scheduledDate ?? new Date())
              : (scheduledTime ?? new Date())
          }
          mode={pickerMode}
          minimumDate={pickerMode === "date" ? new Date() : undefined}
          onChange={handlePickerChange}
        />
      ) : null}
      <Modal
        visible={showDiscardDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardDialog(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Discard trip?</Text>
            <Text style={styles.dialogText}>
              Your trip information will be lost.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setShowDiscardDialog(false)}
                style={styles.dialogSecondary}
              >
                <Text style={styles.dialogSecondaryText}>Keep editing</Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                style={styles.dialogPrimary}
              >
                <Text style={styles.dialogPrimaryText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </RoadSyncScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: "#102d63", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#53688d", fontSize: 15, lineHeight: 22 },
  form: {
    backgroundColor: "#f8faff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e1e8f7",
    padding: 18,
  },
  sectionTitle: { color: "#102d63", fontSize: 16, fontWeight: "900" },
  fieldGroup: { gap: 8 },
  label: { color: "#3b4d73", fontSize: 13, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#ffffff",
    color: "#102d63",
    fontSize: 15,
    paddingHorizontal: 14,
  },
  textArea: { minHeight: 72, paddingTop: 12, textAlignVertical: "top" },
  readOnlyField: {
    minHeight: 52,
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#f3f6ff",
    paddingHorizontal: 14,
  },
  readOnlyText: { color: "#53688d", fontSize: 15, fontWeight: "700" },
  description: { color: "#7585a4", fontSize: 13, lineHeight: 18 },
  toggleRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#94a3b8",
    backgroundColor: "#ffffff",
  },
  checkboxActive: { borderColor: "#102d63", backgroundColor: "#102d63" },
  checkmark: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  toggleLabel: { color: "#3b4d73", fontSize: 15, fontWeight: "700" },
  scheduleFields: { flexDirection: "row", gap: 12 },
  scheduleField: { flex: 1, gap: 8 },
  pickerButton: {
    minHeight: 52,
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
  },
  pickerText: { color: "#102d63", fontSize: 14, fontWeight: "700" },
  placeholderText: { color: "#8997b1", fontSize: 14 },
  error: { color: "#b42318", fontSize: 13, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12 },
  actionButton: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 45, 99, 0.32)",
    padding: 24,
  },
  dialog: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#f8faff",
    padding: 20,
    gap: 10,
  },
  dialogTitle: { color: "#102d63", fontSize: 21, fontWeight: "900" },
  dialogText: { color: "#53688d", fontSize: 15, lineHeight: 21 },
  dialogActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  dialogPrimary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#102d63",
  },
  dialogPrimaryText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  dialogSecondary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe7ff",
  },
  dialogSecondaryText: { color: "#102d63", fontSize: 14, fontWeight: "800" },
});
