import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    activeTrip,
    endTrip,
    getMockTripByCode,
    leaveTrip,
    type RoadTrip,
    type TripMemberStatus,
    updateParticipantStatus,
} from "@/app-data/roadsync";
import RouteMap from "../../components/route-map";

const STATUS_OPTIONS: TripMemberStatus[] = ["Waiting", "Need Help", "Driving"];

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    tripCode?: string;
    participantId?: string;
    isHost?: string;
    name?: string;
  }>();

  const [trip, setTrip] = useState<RoadTrip | undefined>(activeTrip);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    let isMounted = true;

    const syncTrip = async () => {
      if (!tripCode) {
        return;
      }

      try {
        const latestTrip = getMockTripByCode(tripCode);
        if (isMounted) {
          setTrip(latestTrip ?? activeTrip);
        }
      } catch {
        if (isMounted) {
          setTrip(activeTrip);
        }
      }
    };

    void syncTrip();
    const timer = setInterval(() => {
      void syncTrip();
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [tripCode]);

  if (!trip) {
    return null;
  }

  const currentParticipant = trip.participants.find(
    (participant) => participant.id === participantId,
  );

  const handleStatusChange = async (status: TripMemberStatus) => {
    setIsRefreshing(true);
    const updatedTrip = await updateParticipantStatus(
      trip.tripCode,
      participantId,
      status,
    );
    if (updatedTrip) {
      setTrip(updatedTrip);
    }
    setIsRefreshing(false);
  };

  const handleLeaveTrip = async () => {
    setIsRefreshing(true);
    const updatedTrip = await leaveTrip(trip.tripCode, participantId);
    if (updatedTrip) {
      setTrip(updatedTrip);
    }
    setIsRefreshing(false);
  };

  const handleEndTrip = async () => {
    setIsRefreshing(true);
    const updatedTrip = await endTrip(trip.tripCode);
    if (updatedTrip) {
      setTrip(updatedTrip);
    }
    setIsRefreshing(false);
  };

  const scheduledLabel =
    trip.isScheduled && trip.scheduledDate && trip.scheduledTime
      ? `${new Date(trip.scheduledDate).toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} • ${new Date(trip.scheduledTime).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "Not scheduled";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.heroCard}>
          {isRefreshing ? (
            <Text style={styles.refreshing}>Syncing trip updates…</Text>
          ) : null}
          <Text style={styles.createdLabel}>Trip created successfully</Text>
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
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Admin</Text>
            <Text style={styles.detailValue}>{trip.hostName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled</Text>
            <Text style={styles.detailValue}>{scheduledLabel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Google Maps</Text>
            <Text style={styles.detailValue}>
              {trip.routeData.rawUrl ? "Route added" : "No route added"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.routeButton}
            onPress={() => undefined}
          >
            <Text style={styles.routeButtonText}>View Route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => Clipboard.setStringAsync(trip.tripCode)}
          >
            <Text style={styles.copyButtonText}>Copy code</Text>
          </TouchableOpacity>
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
    backgroundColor: "#edf2fb",
  },
  page: {
    gap: 16,
    padding: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#f8faff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e8f7",
    padding: 18,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  code: {
    color: "#102d63",
    fontSize: 14,
    fontWeight: "900",
  },
  createdLabel: {
    color: "#5d6d8d",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statusBadge: {
    backgroundColor: "#e8efff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: "#102d63",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#102d63",
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: "#53688d",
    fontSize: 16,
  },
  meta: {
    color: "#7585a4",
    fontSize: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 4,
  },
  detailLabel: {
    color: "#7585a4",
    fontSize: 13,
    fontWeight: "700",
  },
  detailValue: {
    flex: 1,
    color: "#102d63",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  copyButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#102d63",
  },
  routeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#f3f6ff",
  },
  routeButtonText: {
    color: "#102d63",
    fontSize: 14,
    fontWeight: "800",
  },
  copyButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  refreshing: {
    color: "#102d63",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
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
    backgroundColor: "#f3f6ff",
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e1e8f7",
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
    backgroundColor: "#f3f6ff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#dfe7ff",
  },
  statusPillActive: {
    backgroundColor: "#e8efff",
    borderColor: "#b9c9ef",
  },
  statusPillText: {
    color: "#3b4d73",
    fontWeight: "700",
  },
  statusPillTextActive: {
    color: "#102d63",
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
    backgroundColor: "#102d63",
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
