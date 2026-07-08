import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    activeTrip,
    endTrip,
    getTripByCode,
    leaveTrip,
    type RoadTrip,
    type TripMemberStatus,
    updateParticipantStatus,
} from "@/app-data/roadsync";
import RouteMap from "@/components/route-map";

const STATUS_OPTIONS: TripMemberStatus[] = ["Waiting", "Need Help", "Driving"];

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    tripCode?: string;
    participantId?: string;
    isHost?: string;
    name?: string;
  }>();

  const [trip, setTrip] = useState<RoadTrip | undefined>(() => {
    const tripCode = typeof params.tripCode === "string" ? params.tripCode : "";
    return getTripByCode(tripCode) ?? activeTrip;
  });

  const tripCode =
    typeof params.tripCode === "string"
      ? params.tripCode
      : (trip?.tripCode ?? "");
  const participantId =
    typeof params.participantId === "string"
      ? params.participantId
      : (trip?.participants[0]?.id ?? "");
  const isHost =
    typeof params.isHost === "string" ? params.isHost === "true" : false;

  useEffect(() => {
    const syncTrip = () => {
      const latestTrip = getTripByCode(tripCode) ?? activeTrip;
      setTrip(latestTrip);
    };

    syncTrip();
    const timer = setInterval(syncTrip, 1000);
    return () => clearInterval(timer);
  }, [tripCode]);

  if (!trip) {
    return null;
  }

  const currentParticipant = trip.participants.find(
    (participant) => participant.id === participantId,
  );

  const handleStatusChange = (status: TripMemberStatus) => {
    const updatedTrip = updateParticipantStatus(
      trip.tripCode,
      participantId,
      status,
    );
    if (updatedTrip) {
      setTrip(updatedTrip);
    }
  };

  const handleLeaveTrip = () => {
    const updatedTrip = leaveTrip(trip.tripCode, participantId);
    if (updatedTrip) {
      setTrip(updatedTrip);
    }
  };

  const handleEndTrip = () => {
    const updatedTrip = endTrip(trip.tripCode);
    if (updatedTrip) {
      setTrip(updatedTrip);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.heroCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.code}>Trip Code: {trip.tripCode}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {trip.status === "active" ? "Live" : "Ended"}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{trip.name}</Text>
          <Text style={styles.subtitle}>
            Hosted by {trip.hostName} • {trip.routeData.destinationName}
          </Text>
          <Text style={styles.meta}>{trip.notes}</Text>
        </View>

        <RouteMap trip={trip} />

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>My status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((status) => {
              const isActive = currentParticipant?.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusPill,
                    isActive ? styles.statusPillActive : undefined,
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isActive ? styles.statusPillTextActive : undefined,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trip flow</Text>
          {trip.stops.map((stop) => (
            <View key={stop.id} style={styles.stopRow}>
              <View style={styles.stopDot} />
              <View style={styles.stopCopy}>
                <Text style={styles.stopTitle}>{stop.name}</Text>
                <Text style={styles.stopMeta}>{stop.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Travelers</Text>
          {trip.participants.map((participant) => (
            <View key={participant.id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {participant.name[0]}
                </Text>
              </View>
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>{participant.name}</Text>
                <Text style={styles.memberMeta}>{participant.role}</Text>
              </View>
              <Text style={styles.memberStatus}>{participant.status}</Text>
            </View>
          ))}
        </View>

        {trip.status === "active" ? (
          <View style={styles.actionsRow}>
            {isHost ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleEndTrip}
              >
                <Text style={styles.secondaryButtonText}>End trip</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleLeaveTrip}
              >
                <Text style={styles.secondaryButtonText}>Leave trip</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  page: {
    gap: 16,
    padding: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
    padding: 18,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  code: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "900",
  },
  statusBadge: {
    backgroundColor: "#ecfeff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
  },
  meta: {
    color: "#64748b",
    fontSize: 14,
  },
  mapWrap: {
    minHeight: 260,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  mapView: {
    flex: 1,
    minHeight: 260,
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
    padding: 24,
    minHeight: 260,
  },
  mapFallbackTitle: {
    color: "#1e1b4b",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  mapFallbackText: {
    color: "#475569",
    fontSize: 14,
    textAlign: "center",
  },
  openMapButton: {
    marginTop: 12,
    backgroundColor: "#0f766e",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openMapButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statusPill: {
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  statusPillActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#22c55e",
  },
  statusPillText: {
    color: "#334155",
    fontWeight: "700",
  },
  statusPillTextActive: {
    color: "#166534",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#0f766e",
  },
  stopCopy: {
    gap: 2,
  },
  stopTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  stopMeta: {
    color: "#64748b",
    fontSize: 13,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  memberCopy: {
    flex: 1,
  },
  memberName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  memberMeta: {
    color: "#64748b",
    fontSize: 13,
  },
  memberStatus: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "700",
  },
});
