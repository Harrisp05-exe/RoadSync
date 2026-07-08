import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import type { RoadTrip } from "@/app-data/roadsync";

type RouteMapProps = {
  trip: RoadTrip;
};

export default function RouteMap({ trip }: RouteMapProps) {
  const region = {
    latitude: trip.routeData.centerLatitude,
    longitude: trip.routeData.centerLongitude,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  };

  return (
    <View style={styles.mapWrap}>
      <MapView style={styles.mapView} initialRegion={region} showsUserLocation>
        {trip.routeData.coordinates.length > 1 ? (
          <Polyline
            coordinates={trip.routeData.coordinates}
            strokeColor="#0f766e"
            strokeWidth={4}
          />
        ) : null}
        {trip.participants.map((participant) => (
          <Marker
            key={participant.id}
            coordinate={{
              latitude: participant.location.latitude,
              longitude: participant.location.longitude,
            }}
            title={participant.name}
            description={participant.status}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  mapView: {
    flex: 1,
  },
});
