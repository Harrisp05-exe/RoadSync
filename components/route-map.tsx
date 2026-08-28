import { Platform } from "react-native";

import type { RoadTrip } from "@/app-data/roadsync";
import RouteMapNative from "./route-map.native";
import RouteMapWeb from "./route-map.web";

export type RouteMapProps = {
  trip: RoadTrip;
  mapHeight?: number;
};

const RouteMapComponent = Platform.OS === "web" ? RouteMapWeb : RouteMapNative;

export default function RouteMap(props: RouteMapProps) {
  return <RouteMapComponent {...props} />;
}
