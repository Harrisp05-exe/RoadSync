import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    FlatList,
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

const TIME_ITEM_HEIGHT = 48;

type TimeWheelProps = {
  values: (number | "AM" | "PM")[];
  selectedValue: number | "AM" | "PM";
  formatValue: (value: number | "AM" | "PM") => string;
  onSelect: (value: number | "AM" | "PM") => void;
};

function TimeWheel({
  values,
  selectedValue,
  formatValue,
  onSelect,
}: TimeWheelProps) {
  const listRef = useRef<FlatList<number | "AM" | "PM">>(null);

  const handleScroll = (offset: number) => {
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(offset / TIME_ITEM_HEIGHT)),
    );
    if (values[index] !== selectedValue) {
      onSelect(values[index]);
    }
  };

  const handleScrollEnd = (offset: number) => {
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(offset / TIME_ITEM_HEIGHT)),
    );
    listRef.current?.scrollToOffset({
      offset: index * TIME_ITEM_HEIGHT,
      animated: true,
    });
    onSelect(values[index]);
  };

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={(value) => String(value)}
        showsVerticalScrollIndicator={false}
        snapToInterval={TIME_ITEM_HEIGHT}
        snapToOffsets={values.map((_, index) => index * TIME_ITEM_HEIGHT)}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        initialScrollIndex={Math.max(0, values.indexOf(selectedValue))}
        scrollEventThrottle={16}
        contentContainerStyle={styles.wheelContent}
        getItemLayout={(_, index) => ({
          length: TIME_ITEM_HEIGHT,
          offset: TIME_ITEM_HEIGHT * index,
          index,
        })}
        onScroll={(event) => {
          handleScroll(event.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(event) => {
          handleScrollEnd(event.nativeEvent.contentOffset.y);
        }}
        onMomentumScrollEnd={(event) => {
          handleScrollEnd(event.nativeEvent.contentOffset.y);
        }}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item)} style={styles.wheelItem}>
            <Text
              style={[
                styles.wheelItemText,
                item === selectedValue && styles.wheelItemTextSelected,
              ]}
            >
              {formatValue(item)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export default function CreateTripScreen() {
  const [tripName, setTripName] = useState("");
  const [hostName, setHostName] = useState("Current User");
  const [mapsLink, setMapsLink] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [timeDraft, setTimeDraft] = useState({
    hour: 8,
    minute: 0,
    period: "AM" as "AM" | "PM",
  });
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

  const dateOptions = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
  const timeHours = Array.from({ length: 12 }, (_, index) => index + 1);
  const timeMinutes = [0, 15, 30, 45];

  const openTimePicker = () => {
    const current = scheduledTime ?? new Date();
    const currentHour = current.getHours();
    setTimeDraft({
      hour: currentHour % 12 || 12,
      minute: (Math.round(current.getMinutes() / 15) * 15) % 60,
      period: currentHour >= 12 ? "PM" : "AM",
    });
    setPickerMode("time");
  };

  const handleTimeDraftChange = (
    key: "hour" | "minute" | "period",
    value: number | "AM" | "PM",
  ) => {
    setTimeDraft((current) => ({ ...current, [key]: value }));
  };

  const applyTimeDraft = () => {
    const time = new Date();
    let hours = timeDraft.hour % 12;
    if (timeDraft.period === "PM") hours += 12;
    time.setHours(hours, timeDraft.minute, 0, 0);
    setScheduledTime(time);
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
              <Pressable onPress={openTimePicker} style={styles.pickerButton}>
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
      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerEyebrow}>Schedule trip</Text>
                <Text style={styles.pickerTitle}>
                  {pickerMode === "date" ? "Choose a date" : "Choose a time"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close picker"
                onPress={() => setPickerMode(null)}
                style={styles.closePicker}
              >
                <Text style={styles.closePickerText}>×</Text>
              </Pressable>
            </View>
            {pickerMode === "date" ? (
              <View style={styles.dateGrid}>
                {dateOptions.map((date) => {
                  const isSelected =
                    scheduledDate?.toDateString() === date.toDateString();
                  return (
                    <Pressable
                      key={date.toISOString()}
                      onPress={() => {
                        setScheduledDate(date);
                        setPickerMode(null);
                      }}
                      style={[
                        styles.dateOption,
                        isSelected && styles.dateOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateWeekday,
                          isSelected && styles.selectedPickerText,
                        ]}
                      >
                        {date.toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.dateNumber,
                          isSelected && styles.selectedPickerText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      <Text
                        style={[
                          styles.dateMonth,
                          isSelected && styles.selectedPickerText,
                        ]}
                      >
                        {date.toLocaleDateString(undefined, { month: "short" })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View>
                <View style={styles.wheelLabels}>
                  <Text style={styles.wheelLabel}>Hour</Text>
                  <Text style={styles.wheelLabel}>Minute</Text>
                  <Text style={styles.wheelLabel}>Period</Text>
                </View>
                <View style={styles.wheelRow}>
                  <TimeWheel
                    values={timeHours}
                    selectedValue={timeDraft.hour}
                    formatValue={(value) => String(value)}
                    onSelect={(value) => handleTimeDraftChange("hour", value)}
                  />
                  <TimeWheel
                    values={timeMinutes}
                    selectedValue={timeDraft.minute}
                    formatValue={(value) => String(value).padStart(2, "0")}
                    onSelect={(value) => handleTimeDraftChange("minute", value)}
                  />
                  <TimeWheel
                    values={["AM", "PM"]}
                    selectedValue={timeDraft.period}
                    formatValue={(value) => String(value)}
                    onSelect={(value) => handleTimeDraftChange("period", value)}
                  />
                </View>
                <Pressable onPress={applyTimeDraft} style={styles.doneButton}>
                  <Text style={styles.doneButtonText}>Set time</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  pickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 45, 99, 0.32)",
  },
  pickerSheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#f8faff",
    padding: 22,
    gap: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerEyebrow: {
    color: "#5d6d8d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  pickerTitle: { color: "#102d63", fontSize: 25, fontWeight: "900" },
  closePicker: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#e8efff",
  },
  closePickerText: {
    color: "#102d63",
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 30,
  },
  dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dateOption: {
    width: "22%",
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#ffffff",
    gap: 2,
  },
  dateOptionSelected: { borderColor: "#102d63", backgroundColor: "#102d63" },
  dateWeekday: {
    color: "#7585a4",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dateNumber: { color: "#102d63", fontSize: 24, fontWeight: "900" },
  dateMonth: { color: "#7585a4", fontSize: 11, fontWeight: "700" },
  selectedPickerText: { color: "#ffffff" },
  wheelLabels: { flexDirection: "row", gap: 8, marginBottom: 8 },
  wheelLabel: {
    flex: 1,
    color: "#7585a4",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
  },
  wheelRow: { flexDirection: "row", gap: 8 },
  wheel: {
    flex: 1,
    height: 144,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#e8efff",
    position: "relative",
  },
  wheelContent: { paddingVertical: 48 },
  wheelHighlight: {
    position: "absolute",
    top: 48,
    left: 6,
    right: 6,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#102d63",
    zIndex: 0,
  },
  wheelItem: { height: 48, alignItems: "center", justifyContent: "center" },
  wheelItemText: { color: "#53688d", fontSize: 17, fontWeight: "700" },
  wheelItemTextSelected: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#102d63",
  },
  doneButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
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
