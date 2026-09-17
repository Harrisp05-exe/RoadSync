import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    endTrip,
    leaveTrip,
    startTrip,
    updateParticipantStatus,
    type RoadTrip,
    type TripMemberStatus,
} from "@/app-data/roadsync";
import { auth } from "@/firebase-config";
import { subscribeToSharedTrip } from "@/firebase-trip-service";
import RouteMap from "../../components/route-map";

const STATUS_OPTIONS: TripMemberStatus[] = ["Waiting", "Driving", "SOS"];

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    tripCode?: string;
    participantId?: string;
    isHost?: string;
    name?: string;
  }>();

  const rawId = params.id;
  const rawTripCode = params.tripCode;
  const routeTripId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
  const routeTripCode =
    typeof rawTripCode === "string"
      ? rawTripCode
      : Array.isArray(rawTripCode)
        ? rawTripCode[0]
        : "";
  const identifier = routeTripId || routeTripCode;

  const [trip, setTrip] = useState<RoadTrip | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [startError, setStartError] = useState("");
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderWidthRef = useRef(0);
  const sliderProgress = useRef(new Animated.Value(0)).current;
  const copyToastAnim = useRef(new Animated.Value(0)).current;
  const navigationStarted = useRef(false);

  const resetSlider = () => {
    Animated.spring(sliderProgress, {
      toValue: 0,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  useFocusEffect(
    useCallback(() => {
      navigationStarted.current = false;
      sliderProgress.setValue(0);

      return () => {
        sliderProgress.stopAnimation();
      };
    }, [sliderProgress]),
  );

  useEffect(() => {
    if (!showCopyToast) {
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(copyToastAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(copyToastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      setShowCopyToast(false);
    });

    return () => {
      animation.stop();
    };
  }, [showCopyToast, copyToastAnim]);

  const currentUser = auth.currentUser;
  const isHost =
    params.isHost === "true" ||
    (currentUser != null && trip?.hostId === currentUser.uid) ||
    (currentUser != null &&
      Boolean(
        trip?.participants.some(
          (p) => p.id === currentUser.uid && p.role === "Host",
        ),
      ));

  const rawParticipantId = params.participantId;
  const paramParticipantId =
    typeof rawParticipantId === "string"
      ? rawParticipantId
      : Array.isArray(rawParticipantId)
        ? rawParticipantId[0]
        : "";
  const participantId =
    paramParticipantId || currentUser?.uid || (trip?.participants[0]?.id ?? "");

  const goToNavigation = () => {
    if (navigationStarted.current) {
      return;
    }

    navigationStarted.current = true;
    router.push({
      pathname: "/trip/navigation",
      params: {
        id: trip?.id || routeTripId,
        tripCode: trip?.tripCode || routeTripCode,
        participantId,
        isHost: String(isHost),
        name: trip?.name || params.name,
      },
    });
  };

  const handleStartTrip = async () => {
    const targetTripId = trip?.id || routeTripId || routeTripCode;
    if (!targetTripId || isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    setStartError("");
    try {
      await startTrip(targetTripId);
      goToNavigation();
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "Unable to start the trip. Please try again.",
      );
    }
    setIsRefreshing(false);
  };

  const sliderResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
          return;
        }
        const trackWidth = Math.max(sliderWidthRef.current - 56, 1);
        const progress = Math.max(0, Math.min(1, gesture.dx / trackWidth));
        sliderProgress.setValue(progress);
      },
      onPanResponderRelease: (_, gesture) => {
        const trackWidth = Math.max(sliderWidthRef.current - 56, 1);
        const progress = Math.max(0, Math.min(1, gesture.dx / trackWidth));

        if (progress >= 0.8) {
          Animated.spring(sliderProgress, {
            toValue: progress,
            useNativeDriver: true,
          }).start();
          void handleStartTrip();
          return;
        }

        resetSlider();
      },
      onPanResponderTerminate: resetSlider,
    }),
  ).current;

  useEffect(() => {
    if (!identifier) {
      setIsLoading(false);
      setLoadError("Trip identifier is missing.");
      return;
    }

    setIsLoading(true);
    setLoadError("");

    return subscribeToSharedTrip(
      identifier,
      (loadedTrip) => {
        setTrip(loadedTrip);
        setIsLoading(false);
        void AsyncStorage.setItem(
          "roadsync.lastTrip",
          JSON.stringify({
            id: loadedTrip.id,
            tripCode: loadedTrip.tripCode,
            participantId,
            isHost,
            name: loadedTrip.name,
            nextStop: loadedTrip.nextStop,
          }),
        );
      },
      (error) => {
        setIsLoading(false);
        setLoadError(error.message || "Unable to load the shared trip.");
      },
    );
  }, [identifier]);

  useEffect(() => {
    if (!isHost && trip?.isStarted && !navigationStarted.current) {
      navigationStarted.current = true;
      router.push({
        pathname: "/trip/navigation",
        params: {
          id: trip.id,
          tripCode: trip.tripCode,
          participantId,
          isHost: "false",
          name: trip.name,
        },
      });
    }
  }, [isHost, participantId, trip]);

  useEffect(() => {
    if (trip?.status === "ended") {
      void AsyncStorage.removeItem("roadsync.lastTrip");
      if (!isHost) {
        Alert.alert(
          "Trip Ended",
          "The host has ended this road trip.",
          [
            {
              text: "Return to Home",
              onPress: () => router.replace("/home"),
            },
          ],
          { cancelable: false },
        );
        const timer = setTimeout(() => {
          router.replace("/home");
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [trip?.status, isHost]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#102d63" />
          <Text style={styles.stateText}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Trip Not Found</Text>
          <Text style={styles.stateText}>
            {loadError ||
              "Unable to load the shared trip. Please check the trip code or ID and try again."}
          </Text>
          <TouchableOpacity
            style={styles.stateButton}
            onPress={() => router.replace("/home")}
          >
            <Text style={styles.stateButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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
      <View style={styles.screen}>
        {showCopyToast ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                opacity: copyToastAnim,
                transform: [
                  {
                    translateY: copyToastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.toastText}>Code copied</Text>
          </Animated.View>
        ) : null}
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
              onPress={() => setShowRouteMap(!showRouteMap)}
            >
              <Text style={styles.routeButtonText}>
                {showRouteMap ? "Hide Route" : "View Route"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={async () => {
                await Clipboard.setStringAsync(trip.tripCode);
                setShowCopyToast(true);
              }}
            >
              <Text style={styles.copyButtonText}>Copy code</Text>
            </TouchableOpacity>
          </View>

          {showRouteMap && <RouteMap trip={trip} />}

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
        </ScrollView>
        {trip.status === "active" && !trip.isStarted ? (
          <View style={styles.actionsFooter}>
            <View style={styles.actionsRow}>
              {isHost ? (
                <View style={styles.startSliderColumn}>
                  <View
                    style={styles.startSlider}
                    onLayout={(event) => {
                      const width = event.nativeEvent.layout.width;
                      sliderWidthRef.current = width;
                      setSliderWidth(width);
                    }}
                  >
                    <View
                      style={styles.sliderTrack}
                      {...sliderResponder.panHandlers}
                    >
                      <Text style={styles.sliderHint}>Start trip</Text>
                      <Animated.View
                        style={[
                          styles.sliderThumb,
                          {
                            transform: [
                              {
                                translateX: sliderProgress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [
                                    0,
                                    Math.max(sliderWidth - 56, 1),
                                  ],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="arrow-forward"
                          size={25}
                          color="#ffffff"
                        />
                      </Animated.View>
                    </View>
                  </View>
                  {startError ? (
                    <Text style={styles.startError}>{startError}</Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.waitingForHost}>
                  <Text style={styles.waitingForHostText}>
                    Waiting for the host to start
                  </Text>
                </View>
              )}
              {isHost ? (
                <TouchableOpacity
                  style={styles.endTripButton}
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
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#edf2fb",
  },
  screen: {
    flex: 1,
  },
  page: {
    gap: 16,
    padding: 20,
    paddingBottom: 24,
  },
  actionsFooter: {
    padding: 16,
    paddingBottom: 18,
    backgroundColor: "#edf2fb",
    borderTopWidth: 1,
    borderTopColor: "#dfe7ff",
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
    alignItems: "flex-end",
    gap: 12,
  },
  startSliderColumn: {
    flex: 1,
    gap: 6,
  },
  startSlider: {
    flex: 1,
  },
  startError: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  waitingForHost: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#eef2f7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  waitingForHostText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "800",
  },
  sliderTrack: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#dff3e6",
    justifyContent: "center",
    overflow: "hidden",
  },
  sliderHint: {
    color: "#6d927b",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  sliderThumb: {
    position: "absolute",
    left: 4,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#236b4b",
  },
  secondaryButton: {
    minWidth: 108,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  endTripButton: {
    minWidth: 108,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#c2414c",
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 12,
    backgroundColor: "#10b981",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#10b981",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    zIndex: 10,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  stateTitle: {
    color: "#102d63",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    color: "#53688d",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  stateButton: {
    marginTop: 10,
    backgroundColor: "#102d63",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stateButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
