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
  const coordinates = trip.routeData.coordinates;
  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes, trip.routeData.centerLatitude);
  const maxLatitude = Math.max(...latitudes, trip.routeData.centerLatitude);
  const minLongitude = Math.min(...longitudes, trip.routeData.centerLongitude);
  const maxLongitude = Math.max(...longitudes, trip.routeData.centerLongitude);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.01);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.01);
  const getMarkerPosition = (latitude: number, longitude: number) => ({
    left: `${12 + ((longitude - minLongitude) / longitudeRange) * 76}%`,
    top: `${12 + ((maxLatitude - latitude) / latitudeRange) * 70}%`,
  });

  return (
    <View style={styles.mapFallback}>
      <View style={styles.previewCanvas}>
        <View style={[styles.gridLine, styles.gridLineHorizontalOne]} />
        <View style={[styles.gridLine, styles.gridLineHorizontalTwo]} />
        <View style={[styles.gridLine, styles.gridLineVerticalOne]} />
        <View style={[styles.gridLine, styles.gridLineVerticalTwo]} />
        {coordinates.length > 1
          ? coordinates.slice(0, -1).map((coordinate, index) => {
              const nextCoordinate = coordinates[index + 1];
              const start = getMarkerPosition(
                coordinate.latitude,
                coordinate.longitude,
              );
              const end = getMarkerPosition(
                nextCoordinate.latitude,
                nextCoordinate.longitude,
              );
              const deltaX = parseFloat(end.left) - parseFloat(start.left);
              const deltaY = parseFloat(end.top) - parseFloat(start.top);
              const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
              const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

              return (
                <View
                  key={`${coordinate.latitude}-${coordinate.longitude}`}
                  style={[
                    styles.routeSegment,
                    {
                      left: start.left,
                      top: start.top,
                      width: `${length}%`,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })
          : null}
        {(coordinates.length > 0
          ? coordinates
          : [
              {
                latitude: trip.routeData.centerLatitude,
                longitude: trip.routeData.centerLongitude,
              },
            ]
        ).map((coordinate, index) => (
          <View
            key={`${coordinate.latitude}-${coordinate.longitude}-${index}`}
            style={[
              styles.marker,
              getMarkerPosition(coordinate.latitude, coordinate.longitude),
            ]}
          />
        ))}
        <View style={styles.previewCopy}>
          <Text style={styles.mapFallbackTitle}>Route preview</Text>
          <Text style={styles.mapFallbackText}>
            {trip.routeData.destinationName} via {trip.routeData.originName}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.openMapButton}
        onPress={() =>
          trip.routeData.rawUrl && Linking.openURL(trip.routeData.rawUrl)
        }
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
    backgroundColor: "#f3f6ff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  previewCanvas: {
    width: "100%",
    height: 170,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#e8efff",
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  gridLineHorizontalOne: {
    left: 0,
    right: 0,
    top: "30%",
    height: 2,
  },
  gridLineHorizontalTwo: {
    left: 0,
    right: 0,
    top: "68%",
    height: 2,
  },
  gridLineVerticalOne: {
    top: 0,
    bottom: 0,
    left: "34%",
    width: 2,
  },
  gridLineVerticalTwo: {
    top: 0,
    bottom: 0,
    left: "72%",
    width: 2,
  },
  routeSegment: {
    position: "absolute",
    height: 5,
    borderRadius: 999,
    backgroundColor: "#102d63",
    transformOrigin: "left center",
  },
  marker: {
    position: "absolute",
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#102d63",
  },
  previewCopy: {
    position: "absolute",
    left: 14,
    bottom: 12,
  },
  mapFallbackTitle: {
    color: "#102d63",
    fontSize: 18,
    fontWeight: "800",
  },
  mapFallbackText: {
    color: "#53688d",
    fontSize: 14,
    textAlign: "center",
  },
  openMapButton: {
    marginTop: 8,
    backgroundColor: "#102d63",
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
