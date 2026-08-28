import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { activeTrip, getTripByCode, type RoadTrip, type TripMemberStatus, updateParticipantStatus } from "@/app-data/roadsync";
import RouteMap from "@/components/route-map";

const STATUS_OPTIONS: { value: TripMemberStatus; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: "Driving", label: "Driving", icon: "directions-car" },
  { value: "Waiting", label: "Waiting", icon: "pause-circle-outline" },
  { value: "SOS", label: "SOS", icon: "warning-amber" },
];

export default function NavigationScreen() {
  const params = useLocalSearchParams<{ tripCode?: string; participantId?: string }>();
  const [trip, setTrip] = useState<RoadTrip | undefined>(activeTrip);
  const [isUpdating, setIsUpdating] = useState(false);
  const tripCode = typeof params.tripCode === "string" ? params.tripCode : "";
  const participantId = typeof params.participantId === "string" ? params.participantId : (trip?.participants[0]?.id ?? "");

  useEffect(() => {
    let isMounted = true;
    const syncTrip = async () => {
      if (!tripCode) return;
      const latestTrip = await getTripByCode(tripCode);
      if (isMounted && latestTrip) setTrip(latestTrip);
    };
    void syncTrip();
    const timer = setInterval(() => void syncTrip(), 1500);
    return () => { isMounted = false; clearInterval(timer); };
  }, [tripCode]);

  if (!trip) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><ActivityIndicator color="#102d63" /><Text style={styles.loadingText}>Loading shared route...</Text></View></SafeAreaView>;
  }

  const currentParticipant = trip.participants.find((participant) => participant.id === participantId);
  const activeTravelers = trip.participants.filter((participant) => participant.isActive).length;
  const handleStatusChange = async (status: TripMemberStatus) => {
    setIsUpdating(true);
    const updatedTrip = await updateParticipantStatus(trip.tripCode, participantId, status);
    if (updatedTrip) setTrip(updatedTrip);
    setIsUpdating(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to trip details" onPress={() => router.back()} style={styles.iconButton}>
              <MaterialIcons name="arrow-back" size={22} color="#102d63" />
            </Pressable>
            <View style={styles.topCopy}><Text style={styles.eyebrow}>Live trip</Text><Text style={styles.title} numberOfLines={1}>{trip.name}</Text></View>
            <View style={styles.liveDot} />
          </View>

          <View style={styles.routeSummary}>
            <View style={styles.routePoint}><View style={[styles.pointIcon, styles.startPoint]}><MaterialIcons name="my-location" size={16} color="#ffffff" /></View><View><Text style={styles.pointLabel}>Starting from</Text><Text style={styles.pointName} numberOfLines={1}>{trip.routeData.originName}</Text></View></View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}><View style={[styles.pointIcon, styles.destinationPoint]}><MaterialIcons name="place" size={16} color="#ffffff" /></View><View><Text style={styles.pointLabel}>Heading to</Text><Text style={styles.pointName} numberOfLines={1}>{trip.routeData.destinationName}</Text></View></View>
          </View>

          <RouteMap trip={trip} mapHeight={430} />

          <View style={styles.infoRow}>
            <View><Text style={styles.infoLabel}>Trip code</Text><Text style={styles.infoValue}>{trip.tripCode}</Text></View>
            <View><Text style={styles.infoLabel}>Travelers live</Text><Text style={styles.infoValue}>{activeTravelers}</Text></View>
            <View><Text style={styles.infoLabel}>Next stop</Text><Text style={styles.infoValue} numberOfLines={1}>{trip.nextStop}</Text></View>
          </View>

          <View style={styles.peopleSection}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your crew</Text><Text style={styles.sectionMeta}>Updates live</Text></View>
            {trip.participants.map((participant) => <View style={styles.memberRow} key={participant.id}><View style={styles.avatar}><Text style={styles.avatarText}>{participant.name[0]}</Text></View><Text style={styles.memberName}>{participant.name}</Text><Text style={[styles.memberStatus, participant.status === "SOS" && styles.sosText]}>{participant.status}</Text></View>)}
          </View>
        </ScrollView>

        <View style={styles.statusFooter}>
          <View style={styles.statusHeader}><View><Text style={styles.statusTitle}>Your status</Text><Text style={styles.statusSubtitle}>Let your crew know how you are doing</Text></View>{isUpdating ? <ActivityIndicator color="#102d63" /> : null}</View>
          <View style={styles.statusToggle}>
            {STATUS_OPTIONS.map((option) => {
              const isSelected = currentParticipant?.status === option.value;
              return <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={`Set status to ${option.label}`} onPress={() => void handleStatusChange(option.value)} style={[styles.statusOption, isSelected && styles.statusOptionSelected, isSelected && option.value === "SOS" && styles.statusOptionSos]}><MaterialIcons name={option.icon} size={19} color={isSelected ? "#ffffff" : "#53688d"} /><Text style={[styles.statusOptionText, isSelected && styles.statusOptionTextSelected]}>{option.label}</Text></Pressable>;
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#edf2fb" }, screen: { flex: 1 }, content: { padding: 18, paddingBottom: 22, gap: 14 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 }, iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#dfe7ff" }, topCopy: { flex: 1 }, liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#5267b8" },
  eyebrow: { color: "#5267b8", fontSize: 11, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" }, title: { color: "#102d63", fontSize: 23, fontWeight: "900" },
  routeSummary: { backgroundColor: "#102d63", borderRadius: 18, padding: 16, gap: 8 }, routePoint: { flexDirection: "row", alignItems: "center", gap: 10 }, pointIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, startPoint: { backgroundColor: "#5267b8" }, destinationPoint: { backgroundColor: "#dd6b4d" }, routeLine: { height: 12, width: 2, marginLeft: 14, backgroundColor: "#8799cb" }, pointLabel: { color: "#b9c6ea", fontSize: 11, fontWeight: "700" }, pointName: { color: "#ffffff", fontSize: 15, fontWeight: "800", maxWidth: 250 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#dfe7ff", padding: 15, gap: 10 }, infoLabel: { color: "#7585a4", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }, infoValue: { color: "#102d63", fontSize: 14, fontWeight: "900", marginTop: 3, maxWidth: 110 },
  peopleSection: { gap: 12, paddingTop: 2 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, sectionTitle: { color: "#102d63", fontSize: 18, fontWeight: "900" }, sectionMeta: { color: "#5267b8", fontSize: 12, fontWeight: "800" }, memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#e8efff", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#3153a0", fontWeight: "900" }, memberName: { flex: 1, color: "#243b6b", fontSize: 14, fontWeight: "800" }, memberStatus: { color: "#5267b8", fontSize: 12, fontWeight: "800" }, sosText: { color: "#c84335" },
  statusFooter: { borderTopWidth: 1, borderTopColor: "#dfe7ff", backgroundColor: "#ffffff", padding: 16, paddingBottom: 18, gap: 12 }, statusHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, statusTitle: { color: "#102d63", fontSize: 16, fontWeight: "900" }, statusSubtitle: { color: "#7585a4", fontSize: 12, marginTop: 2 }, statusToggle: { flexDirection: "row", gap: 7 }, statusOption: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: "#f3f6ff", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 }, statusOptionSelected: { backgroundColor: "#5267b8" }, statusOptionSos: { backgroundColor: "#c84335" }, statusOptionText: { color: "#53688d", fontSize: 12, fontWeight: "900" }, statusOptionTextSelected: { color: "#ffffff" }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }, loadingText: { color: "#53688d", fontSize: 14, fontWeight: "700" },
});
