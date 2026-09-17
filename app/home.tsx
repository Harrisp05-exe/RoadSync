import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "@/firebase-config";

type SavedTripInfo = {
  id: string;
  tripCode: string;
  participantId: string;
  isHost: boolean;
  name: string;
  nextStop?: string;
};

export default function HomeScreen() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  const [userName, setUserName] = useState("Traveler");
  const [lastTrip, setLastTrip] = useState<SavedTripInfo | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const [savedName, savedTrip] = await Promise.all([
          AsyncStorage.getItem("roadsync.user.username"),
          AsyncStorage.getItem("roadsync.lastTrip"),
        ]);
        const currentName =
          savedName?.trim() ||
          auth.currentUser?.displayName?.trim() ||
          "Traveler";
        setUserName(currentName);

        if (savedTrip) {
          try {
            setLastTrip(JSON.parse(savedTrip));
          } catch {
            setLastTrip(null);
          }
        } else {
          setLastTrip(null);
        }
      };
      void loadData();
    }, []),
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const initial = (userName[0] || "T").toUpperCase();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.screen, { opacity: fadeIn }]}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Animated.View
              style={{
                opacity: fadeIn,
                transform: [
                  {
                    translateY: fadeIn.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.eyebrow}>Your road ahead</Text>
                  <Text style={styles.brand}>RoadSync</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  onPress={() => router.push("/profile")}
                  style={({ pressed }) => [
                    styles.avatar,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.avatarText}>{initial}</Text>
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: fadeIn,
                transform: [
                  {
                    translateY: fadeIn.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.heroCard}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroGreeting}>
                    {getGreeting()}, {userName}
                  </Text>
                  <Text style={styles.heroTitle}>Ready for the next mile?</Text>
                  <Text style={styles.heroSubtitle}>
                    Plan the route, keep your crew updated, and move together
                    with confidence.
                  </Text>
                </View>
                <Image
                  source={require("../assets/images/welcome_image.jpg")}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: fadeIn,
                transform: [
                  {
                    translateY: fadeIn.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              }}
            >
              {lastTrip ? (
                <View style={styles.tripCard}>
                  <View style={styles.tripCardHeader}>
                    <Text style={styles.tripLabel}>Active trip</Text>
                    <Pressable
                      onPress={async () => {
                        await AsyncStorage.removeItem("roadsync.lastTrip");
                        setLastTrip(null);
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.dismissTripText}>Dismiss</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.tripTitle} numberOfLines={1}>
                    {lastTrip.name}
                  </Text>
                  <View style={styles.tripMetaRow}>
                    <View style={styles.tripBadge}>
                      <Text style={styles.tripBadgeText}>
                        CODE: {lastTrip.tripCode}
                      </Text>
                    </View>
                    {lastTrip.isHost ? (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>Host</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.resumeButton}
                    onPress={() => {
                      if (lastTrip.isHost) {
                        router.push({
                          pathname: "/trip/navigation",
                          params: {
                            id: lastTrip.id,
                            tripCode: lastTrip.tripCode,
                            participantId: lastTrip.participantId,
                            isHost: "true",
                            name: lastTrip.name,
                          },
                        });
                      } else {
                        router.push({
                          pathname: "/trip/[id]",
                          params: {
                            id: lastTrip.id,
                            tripCode: lastTrip.tripCode,
                            participantId: lastTrip.participantId,
                            isHost: "false",
                            name: lastTrip.name,
                          },
                        });
                      }
                    }}
                  >
                    <Text style={styles.resumeButtonText}>Resume Trip</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.tripCard}>
                  <Text style={styles.tripLabel}>Active trip</Text>
                  <Text style={styles.emptyStateText}>No active trips</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create a new trip or enter a code to join your crew.
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>

          <Animated.View
            style={{
              opacity: fadeIn,
              transform: [
                {
                  translateY: fadeIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            }}
          >
            <View style={styles.actions}>
              <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/create-trip")}
                  onPressIn={() => {
                    Animated.spring(primaryScale, {
                      toValue: 0.98,
                      friction: 8,
                      tension: 170,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(primaryScale, {
                      toValue: 1,
                      friction: 8,
                      tension: 170,
                      useNativeDriver: true,
                    }).start();
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Create trip</Text>
                </Pressable>
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: secondaryScale }] }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/join-trip")}
                  onPressIn={() => {
                    Animated.spring(secondaryScale, {
                      toValue: 0.98,
                      friction: 8,
                      tension: 170,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(secondaryScale, {
                      toValue: 1,
                      friction: 8,
                      tension: 170,
                      useNativeDriver: true,
                    }).start();
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Join trip</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: "#edf2fb",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: {
    color: "#5f6b8a",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  brand: {
    color: "#102d63",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#102d63",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f7f9ff",
    borderRadius: 22,
    padding: 18,
    minHeight: 180,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e1e8f7",
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },
  heroGreeting: {
    color: "#4a5d8a",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#102d63",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "#495c7d",
    fontSize: 14,
    lineHeight: 20,
  },
  heroImage: {
    width: 110,
    height: 110,
    borderRadius: 16,
  },
  tripCard: {
    backgroundColor: "#f8faff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e3eafc",
  },
  tripLabel: {
    color: "#4f618d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  tripCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dismissTripText: {
    color: "#7585a4",
    fontSize: 12,
    fontWeight: "700",
  },
  tripTitle: {
    color: "#102d63",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  tripMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  tripBadge: {
    backgroundColor: "#e8efff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tripBadgeText: {
    color: "#3153a0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  hostBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hostBadgeText: {
    color: "#065f46",
    fontSize: 12,
    fontWeight: "800",
  },
  resumeButton: {
    backgroundColor: "#102d63",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyStateText: {
    color: "#4a5d8a",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    paddingTop: 8,
  },
  emptyStateSubtext: {
    color: "#7585a4",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  actions: {
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#102d63",
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f6ff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#102d63",
    fontSize: 16,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.8,
  },
});
