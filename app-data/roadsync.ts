export type TripMemberStatus = "Waiting" | "Need Help" | "Driving";

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
  routeData: TripRouteData;
  participants: TripMember[];
  stops: TripStop[];
  status: "active" | "ended";
  safetyStatus: "All clear" | "Check-in due" | "Attention needed";
  nextStop: string;
  notes: string;
};

export type CreateTripInput = {
  name: string;
  hostName: string;
  mapUrl: string;
};

const tripStore = new Map<string, RoadTrip>();

export function generateNumericCode(length = 5): string {
  return Array.from({ length }, () =>
    String(Math.floor(Math.random() * 10)),
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

function parseCoordinatesFromUrl(url: string): TripLocation | null {
  const match = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

  if (match) {
    return {
      latitude: Number(match[1]),
      longitude: Number(match[2]),
    };
  }

  const deepMatch = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);

  if (deepMatch) {
    return {
      latitude: Number(deepMatch[1]),
      longitude: Number(deepMatch[2]),
    };
  }

  return null;
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
    const coordinates = parseCoordinatesFromUrl(parsed.toString())
      ? [{ latitude: 37.7749, longitude: -122.4194 }]
      : [];
    const center =
      parseCoordinatesFromUrl(parsed.toString()) ?? fallbackLocation;

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

export function createTrip(input: CreateTripInput): RoadTrip {
  const normalizedName = input.name.trim() || "Road Trip";
  const normalizedHost = input.hostName.trim() || "Host";
  const tripCode = generateNumericCode();
  const routeData = parseGoogleMapsRoute(input.mapUrl);
  const baseLocation = routeData.coordinates[0] ?? {
    latitude: routeData.centerLatitude,
    longitude: routeData.centerLongitude,
  };

  const trip: RoadTrip = {
    id: generateTripId(normalizedName),
    name: normalizedName,
    tripCode,
    hostName: normalizedHost,
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
      { id: "start", name: "Depart", time: "Now", status: "current" },
      {
        id: "mid",
        name: routeData.destinationName,
        time: "En route",
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

export function getTripByCode(code: string): RoadTrip | undefined {
  return tripStore.get(code.trim());
}

export function joinTrip(
  code: string,
  travelerName: string,
): {
  trip?: RoadTrip;
  participant?: TripMember;
  error?: string;
} {
  const normalizedCode = code.trim();
  const trip = tripStore.get(normalizedCode);

  if (!trip) {
    return { error: "That trip code was not found. Please try again." };
  }

  if (trip.status !== "active") {
    return { error: "This trip has already ended." };
  }

  const normalizedName = travelerName.trim();

  if (!normalizedName) {
    return { error: "Please enter your name before joining." };
  }

  const isDuplicate = trip.participants.some(
    (participant) =>
      participant.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  const resolvedName = isDuplicate
    ? `${normalizedName} ${trip.participants.length + 1}`
    : normalizedName;
  const participant: TripMember = {
    id: `traveler-${Date.now()}`,
    name: resolvedName,
    role: "Traveler",
    status: "Waiting",
    location: trip.routeData.coordinates[0] ?? {
      latitude: trip.routeData.centerLatitude,
      longitude: trip.routeData.centerLongitude,
    },
    isActive: true,
    joinedAt: new Date().toISOString(),
  };

  trip.participants.push(participant);
  return { trip, participant };
}

export function updateParticipantStatus(
  code: string,
  participantId: string,
  status: TripMemberStatus,
): RoadTrip | undefined {
  const trip = tripStore.get(code.trim());

  if (!trip) {
    return undefined;
  }

  trip.participants = trip.participants.map((participant) =>
    participant.id === participantId ? { ...participant, status } : participant,
  );

  return trip;
}

export function leaveTrip(
  code: string,
  participantId: string,
): RoadTrip | undefined {
  const trip = tripStore.get(code.trim());

  if (!trip) {
    return undefined;
  }

  trip.participants = trip.participants.filter(
    (participant) => participant.id !== participantId,
  );

  if (trip.participants.length === 0) {
    trip.status = "ended";
    trip.notes = "The trip has ended.";
  }

  return trip;
}

export function endTrip(code: string): RoadTrip | undefined {
  const trip = tripStore.get(code.trim());

  if (!trip) {
    return undefined;
  }

  trip.status = "ended";
  trip.notes = "The host ended this trip.";
  return trip;
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
