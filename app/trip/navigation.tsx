import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    activeTrip,
    getTripByCode,
    type RoadTrip,
    type TripMemberStatus,
    updateParticipantStatus,
} from "@/app-data/roadsync";
import RouteMap from "@/components/route-map";

const STATUS_OPTIONS: {
  value: TripMemberStatus;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { value: "Driving", label: "Driving", icon: "directions-car" },
  { value: "Waiting", label: "Waiting", icon: "pause-circle-outline" },
  { value: "SOS", label: "SOS", icon: "warning-amber" },
];

export default function NavigationScreen() {
  const params = useLocalSearchParams<{
    tripCode?: string;
    participantId?: string;
  }>();
  const { height } = useWindowDimensions();
  const [trip, setTrip] = useState<RoadTrip | undefined>(activeTrip);
  const [isUpdating, setIsUpdating] = useState(false);
  const tripCode = typeof params.tripCode === "string" ? params.tripCode : "";
  const participantId =
    typeof params.participantId === "string"
      ? params.participantId
      : (trip?.participants[0]?.id ?? "");
  const sheetHeight = Math.min(height * 0.72, 590);
  const collapsedHeight = 154;
  const sheetTravel = Math.max(sheetHeight - collapsedHeight, 1);
  const sheetPosition = useRef(new Animated.Value(sheetTravel)).current;
  const sheetPositionRef = useRef(sheetTravel);
  const sheetDragStartRef = useRef(sheetTravel);

  useEffect(() => {
    sheetPosition.setValue(sheetTravel);
    sheetPositionRef.current = sheetTravel;
  }, [sheetPosition, sheetTravel]);

  useEffect(() => {
    let isMounted = true;
    const syncTrip = async () => {
      if (!tripCode) return;
      const latestTrip = await getTripByCode(tripCode);
      if (isMounted && latestTrip) setTrip(latestTrip);
    };
    void syncTrip();
    const timer = setInterval(() => void syncTrip(), 1500);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [tripCode]);

  const snapSheet = (open: boolean) => {
    const toValue = open ? 0 : sheetTravel;
    sheetPositionRef.current = toValue;
    Animated.spring(sheetPosition, {
      toValue,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
  };
  const sheetResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        sheetPosition.stopAnimation((value) => {
          sheetDragStartRef.current = value;
          sheetPositionRef.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const nextPosition = Math.max(
          0,
          Math.min(sheetTravel, sheetDragStartRef.current + gesture.dy),
        );
        sheetPositionRef.current = nextPosition;
        sheetPosition.setValue(nextPosition);
      },
      onPanResponderRelease: (_, gesture) =>
        snapSheet(
          gesture.dy < -40 || sheetPositionRef.current < sheetTravel / 2,
        ),
    }),
  ).current;

  if (!trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color="#102d63" />
          <Text style={styles.loadingText}>Loading shared route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentParticipant = trip.participants.find(
    (participant) => participant.id === participantId,
  );
  const activeTravelers = trip.participants.filter(
    (participant) => participant.isActive,
  ).length;
  const handleStatusChange = async (status: TripMemberStatus) => {
    setIsUpdating(true);
    const updatedTrip = await updateParticipantStatus(
      trip.tripCode,
      participantId,
      status,
    );
    if (updatedTrip) setTrip(updatedTrip);
    setIsUpdating(false);
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.mapLayer}>
          <RouteMap trip={trip} mapHeight={height} fullScreen />
        </View>
        <View style={styles.mapHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to trip details"
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <MaterialIcons name="arrow-back" size={22} color="#102d63" />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={styles.eyebrow}>Live trip</Text>
            <Text style={styles.title} numberOfLines={1}>
              {trip.name}
            </Text>
          </View>
          <View style={styles.liveDot} />
        </View>

        <Animated.View
          {...sheetResponder.panHandlers}
          style={[
            styles.sheet,
            { height: sheetHeight, transform: [{ translateY: sheetPosition }] },
          ]}
        >
          <View style={styles.sheetHandleArea}>
            <View style={styles.sheetHandle} />
            <View style={styles.peekRow}>
              <View>
                <Text style={styles.peekLabel}>Next stop</Text>
                <Text style={styles.peekValue} numberOfLines={1}>
                  {trip.nextStop}
                </Text>
              </View>
              <View style={styles.peekStatus}>
                <View style={styles.peekDot} />
                <Text style={styles.peekStatusText}>
                  {currentParticipant?.status ?? "Waiting"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.sheetContent}>
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>Trip code</Text>
                <Text style={styles.infoValue}>{trip.tripCode}</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Travelers live</Text>
                <Text style={styles.infoValue}>{activeTravelers}</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Next stop</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {trip.nextStop}
                </Text>
              </View>
            </View>
            <View style={styles.peopleSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your crew</Text>
                <Text style={styles.sectionMeta}>Updates live</Text>
              </View>
              {trip.participants.map((participant) => (
                <View style={styles.memberRow} key={participant.id}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{participant.name[0]}</Text>
                  </View>
                  <Text style={styles.memberName}>{participant.name}</Text>
                  <Text
                    style={[
                      styles.memberStatus,
                      participant.status === "SOS" && styles.sosText,
                    ]}
                  >
                    {participant.status}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.statusPanel}>
              <View style={styles.statusHeader}>
                <View>
                  <Text style={styles.statusTitle}>Your status</Text>
                  <Text style={styles.statusSubtitle}>
                    Let your crew know how you are doing
                  </Text>
                </View>
                {isUpdating ? <ActivityIndicator color="#102d63" /> : null}
              </View>
              <View style={styles.statusToggle}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected =
                    currentParticipant?.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityLabel={`Set status to ${option.label}`}
                      onPress={() => void handleStatusChange(option.value)}
                      style={[
                        styles.statusOption,
                        isSelected && styles.statusOptionSelected,
                        isSelected &&
                          option.value === "SOS" &&
                          styles.statusOptionSos,
                      ]}
                    >
                      <MaterialIcons
                        name={option.icon}
                        size={19}
                        color={isSelected ? "#ffffff" : "#53688d"}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          isSelected && styles.statusOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#edf2fb" },
  screen: { flex: 1 },
  mapLayer: { ...StyleSheet.absoluteFillObject },
  mapHeader: {
    position: "absolute",
    top: 12,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
  },
  headerTitle: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5267b8",
  },
  eyebrow: {
    color: "#5267b8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: "#102d63", fontSize: 18, fontWeight: "900" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#102d63",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  sheetHandleArea: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#b9c9ef",
    marginBottom: 12,
  },
  peekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  peekLabel: {
    color: "#7585a4",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  peekValue: {
    color: "#102d63",
    fontSize: 17,
    fontWeight: "900",
    maxWidth: 220,
  },
  peekStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8efff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  peekDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#5267b8" },
  peekStatusText: { color: "#3153a0", fontSize: 12, fontWeight: "900" },
  sheetScroll: { flex: 1, backgroundColor: "#ffffff" },
  sheetContent: {
    padding: 18,
    paddingTop: 2,
    paddingBottom: 28,
    gap: 18,
    backgroundColor: "#ffffff",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8faff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    padding: 15,
    gap: 10,
  },
  infoLabel: {
    color: "#7585a4",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#102d63",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
    maxWidth: 110,
  },
  peopleSection: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: "#102d63", fontSize: 18, fontWeight: "900" },
  sectionMeta: { color: "#5267b8", fontSize: 12, fontWeight: "800" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e8efff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#3153a0", fontWeight: "900" },
  memberName: { flex: 1, color: "#243b6b", fontSize: 14, fontWeight: "800" },
  memberStatus: { color: "#5267b8", fontSize: 12, fontWeight: "800" },
  sosText: { color: "#c84335" },
  statusPanel: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#dfe7ff",
    paddingTop: 16,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusTitle: { color: "#102d63", fontSize: 16, fontWeight: "900" },
  statusSubtitle: { color: "#7585a4", fontSize: 12, marginTop: 2 },
  statusToggle: { flexDirection: "row", gap: 7 },
  statusOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#f3f6ff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  statusOptionSelected: { backgroundColor: "#5267b8" },
  statusOptionSos: { backgroundColor: "#c84335" },
  statusOptionText: { color: "#53688d", fontSize: 12, fontWeight: "900" },
  statusOptionTextSelected: { color: "#ffffff" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#53688d", fontSize: 14, fontWeight: "700" },
});
