export type TripMemberStatus = "Waiting" | "SOS" | "Driving";

export type TripLocation = {
  latitude: number;
  longitude: number;
};

export type TripMember = {
  id: string;
  name: string;
  role: "Host" | "Traveler";
  status: TripMemberStatus;
  location: TripLocation;
  isActive: boolean;
  joinedAt: string;
};

export type TripRouteData = {
  rawUrl: string;
  destinationName: string;
  originName: string;
  centerLatitude: number;
  centerLongitude: number;
  coordinates: TripLocation[];
};

export type TripStop = {
  id: string;
  name: string;
  time: string;
  status: "done" | "current" | "upcoming";
};

export type RoadTrip = {
  id: string;
  name: string;
  tripCode: string;
  hostName: string;
  hostId?: string;
  isScheduled?: boolean;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  routeData: TripRouteData;
  participants: TripMember[];
  stops: TripStop[];
  status: "active" | "ended";
  isStarted?: boolean;
  startedAt?: string | null;
  safetyStatus: "All clear" | "Check-in due" | "Attention needed";
  nextStop: string;
  notes: string;
};

import {
    createSharedTrip,
    endSharedTrip,
    getSharedTripByCode,
    joinSharedTrip,
    leaveSharedTrip,
    startSharedTrip,
    updateSharedParticipantStatus,
} from "@/firebase-trip-service";

export type CreateTripInput = {
  name: string;
  hostName: string;
  mapUrl: string;
  isScheduled?: boolean;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
};

const tripStore = new Map<string, RoadTrip>();

export function generateNumericCode(length = 5): string {
  return Array.from({ length }, () =>
    String(Math.floor(Math.random() * 10)),
  ).join("");
}

export function generateTripCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

export function generateTripId(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "road-trip";
}

function parseCoordinatePair(value: string): TripLocation | null {
  const match = value.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  return {
    latitude: Number(match[1]),
    longitude: Number(match[2]),
  };
}

function parseCoordinatesFromUrl(url: string): TripLocation[] {
  const coordinates: TripLocation[] = [];
  const addCoordinate = (location: TripLocation | null) => {
    if (!location) {
      return;
    }

    const exists = coordinates.some(
      (coordinate) =>
        coordinate.latitude === location.latitude &&
        coordinate.longitude === location.longitude,
    );

    if (!exists) {
      coordinates.push(location);
    }
  };

  const matches = Array.from(
    url.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g),
  );
  matches.forEach((match) => {
    addCoordinate({ latitude: Number(match[1]), longitude: Number(match[2]) });
  });

  const coordinateMatches = Array.from(
    url.matchAll(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/|$)/g),
  );
  coordinateMatches.forEach((match) => {
    addCoordinate({ latitude: Number(match[1]), longitude: Number(match[2]) });
  });

  try {
    const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    ["origin", "saddr", "from"].forEach((key) => {
      const value = parsedUrl.searchParams.get(key);
      if (value) {
        addCoordinate(parseCoordinatePair(decodeURIComponent(value)));
      }
    });

    ["destination", "daddr", "to"].forEach((key) => {
      const value = parsedUrl.searchParams.get(key);
      if (value) {
        addCoordinate(parseCoordinatePair(decodeURIComponent(value)));
      }
    });
  } catch {
    // Ignore malformed URLs and fall back to the parsed coordinate list.
  }

  return coordinates;
}

function getRouteCenter(
  coordinates: TripLocation[],
  fallbackLocation: TripLocation,
) {
  if (coordinates.length === 0) {
    return fallbackLocation;
  }

  if (coordinates.length === 1) {
    return coordinates[0];
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  return {
    latitude: (first.latitude + last.latitude) / 2,
    longitude: (first.longitude + last.longitude) / 2,
  };
}

export function parseGoogleMapsRoute(mapUrl: string): TripRouteData {
  const normalizedUrl = mapUrl.trim();
  const fallbackLocation = { latitude: 37.7749, longitude: -122.4194 };

  try {
    const parsed = new URL(
      normalizedUrl.startsWith("http")
        ? normalizedUrl
        : `https://${normalizedUrl}`,
    );
    const destinationName =
      parsed.searchParams.get("daddr") ||
      parsed.searchParams.get("destination") ||
      parsed.searchParams.get("q") ||
      "Destination";
    const originName = parsed.searchParams.get("saddr") || "Current location";
    const coordinates = parseCoordinatesFromUrl(parsed.toString());
    const center = getRouteCenter(coordinates, fallbackLocation);

    return {
      rawUrl: normalizedUrl,
      destinationName,
      originName,
      centerLatitude: center.latitude,
      centerLongitude: center.longitude,
      coordinates,
    };
  } catch {
    return {
      rawUrl: normalizedUrl,
      destinationName: "Destination",
      originName: "Current location",
      centerLatitude: fallbackLocation.latitude,
      centerLongitude: fallbackLocation.longitude,
      coordinates: [],
    };
  }
}

export async function createTrip(input: CreateTripInput): Promise<RoadTrip> {
  const normalizedName = input.name.trim() || "Road Trip";
  const normalizedHost = input.hostName.trim() || "Host";
  const routeData = parseGoogleMapsRoute(input.mapUrl);
  const createdTrip = await createSharedTrip({
    name: normalizedName,
    hostName: normalizedHost,
    routeData,
    isScheduled: input.isScheduled ?? false,
    scheduledDate: input.scheduledDate ?? null,
    scheduledTime: input.scheduledTime ?? null,
    stops: [
      { id: "start", name: "Depart", time: "Now", status: "current" },
      {
        id: "destination",
        name: routeData.destinationName,
        time: "En route",
        status: "upcoming",
      },
    ],
  });

  tripStore.set(createdTrip.tripCode, createdTrip);
  return createdTrip;
}

export function createMockTrip(input: CreateTripInput): RoadTrip {
  const normalizedName = input.name.trim() || "Road Trip";
  const normalizedHost = input.hostName.trim() || "Current User";
  const routeData = parseGoogleMapsRoute(input.mapUrl);
  const baseLocation = routeData.coordinates[0] ?? {
    latitude: routeData.centerLatitude,
    longitude: routeData.centerLongitude,
  };
  const trip: RoadTrip = {
    id: `${generateTripId(normalizedName)}-${Date.now()}`,
    name: normalizedName,
    tripCode: generateTripCode(),
    hostName: normalizedHost,
    isScheduled: input.isScheduled ?? false,
    scheduledDate: input.scheduledDate ?? null,
    scheduledTime: input.scheduledTime ?? null,
    routeData,
    participants: [
      {
        id: `host-${Date.now()}`,
        name: normalizedHost,
        role: "Host",
        status: "Waiting",
        location: baseLocation,
        isActive: true,
        joinedAt: new Date().toISOString(),
      },
    ],
    stops: [
      {
        id: "start",
        name: "Depart",
        time: input.isScheduled ? "Scheduled" : "Now",
        status: "current",
      },
      {
        id: "destination",
        name: routeData.destinationName,
        time: "Upcoming",
        status: "upcoming",
      },
    ],
    status: "active",
    safetyStatus: "All clear",
    nextStop: routeData.destinationName,
    notes: `${normalizedHost} created this shared trip.`,
  };

  tripStore.set(trip.tripCode, trip);
  return trip;
}

export function getMockTripByCode(code: string): RoadTrip | undefined {
  return tripStore.get(code.trim());
}

export async function getTripByCode(
  code: string,
): Promise<RoadTrip | undefined> {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return undefined;
  }

  const trip = await getSharedTripByCode(normalizedCode);
  if (trip) {
    tripStore.set(normalizedCode, trip);
  }
  return trip;
}

export async function joinTrip(
  code: string,
  travelerName: string,
): Promise<{
  trip?: RoadTrip;
  participant?: TripMember;
  error?: string;
}> {
  try {
    const result = await joinSharedTrip(code, travelerName);
    tripStore.set(result.trip.tripCode, result.trip);
    return result;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to join the trip right now.",
    };
  }
}

export async function updateParticipantStatus(
  code: string,
  participantId: string,
  status: TripMemberStatus,
): Promise<RoadTrip | undefined> {
  const trip = await getSharedTripByCode(code);
  if (
    !trip ||
    !trip.participants.some((participant) => participant.id === participantId)
  ) {
    return undefined;
  }

  await updateSharedParticipantStatus(trip.id, status);
  return getSharedTripByCode(code);
}

export async function startTrip(tripIdOrCode: string): Promise<void> {
  await startSharedTrip(tripIdOrCode);
}

export async function leaveTrip(
  code: string,
  participantId: string,
): Promise<RoadTrip | undefined> {
  const trip = await getSharedTripByCode(code);
  if (
    !trip ||
    !trip.participants.some((participant) => participant.id === participantId)
  ) {
    return undefined;
  }

  await leaveSharedTrip(trip.id);
  return getSharedTripByCode(code);
}

export async function endTrip(code: string): Promise<RoadTrip | undefined> {
  const trip = await getSharedTripByCode(code);
  if (!trip) {
    return undefined;
  }

  await endSharedTrip(trip.id);
  return getSharedTripByCode(code);
}

export const activeTrip: RoadTrip = {
  id: "blue-ridge",
  name: "Blue Ridge Weekend",
  tripCode: "48213",
  hostName: "Maya",
  routeData: {
    rawUrl: "https://maps.google.com/?daddr=Asheville%2C+NC",
    destinationName: "Asheville, NC",
    originName: "Charlotte, NC",
    centerLatitude: 35.2271,
    centerLongitude: -80.8431,
    coordinates: [],
  },
  participants: [
    {
      id: "maya",
      name: "Maya",
      role: "Host",
      status: "Driving",
      location: { latitude: 35.2271, longitude: -80.8431 },
      isActive: true,
      joinedAt: new Date().toISOString(),
    },
  ],
  stops: [
    { id: "depart", name: "Leave Charlotte", time: "8:30 AM", status: "done" },
    {
      id: "rest",
      name: "Black Mountain rest area",
      time: "10:40 AM",
      status: "current",
    },
    {
      id: "arrival",
      name: "Arrive in Asheville",
      time: "11:50 AM",
      status: "upcoming",
    },
  ],
  status: "active",
  safetyStatus: "All clear",
  nextStop: "Black Mountain rest area",
  notes: "A sample trip for the RoadSync demo.",
};

tripStore.set(activeTrip.tripCode, activeTrip);

export const upcomingTrips: RoadTrip[] = [activeTrip];
