import {
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import type { RoadTrip } from "@/app-data/roadsync";

type RouteMapProps = {
  trip: RoadTrip;
};

export default function RouteMap({ trip }: RouteMapProps) {
  return (
    <View style={styles.mapFallback}>
      <Text style={styles.mapFallbackTitle}>Route preview</Text>
      <Text style={styles.mapFallbackText}>
        {trip.routeData.destinationName} via {trip.routeData.originName}
      </Text>
      <TouchableOpacity
        style={styles.openMapButton}
        onPress={() => Linking.openURL(trip.routeData.rawUrl)}
      >
        <Text style={styles.openMapButtonText}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mapFallback: {
    height: 260,
    borderRadius: 16,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#99f6e4",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  mapFallbackTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  mapFallbackText: {
    color: "#334155",
    fontSize: 14,
    textAlign: "center",
  },
  openMapButton: {
    marginTop: 8,
    backgroundColor: "#0f766e",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  openMapButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
