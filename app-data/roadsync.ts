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

import Constants from "expo-constants";

export type CreateTripInput = {
  name: string;
  hostName: string;
  mapUrl: string;
};

const tripStore = new Map<string, RoadTrip>();

function getServerUrlCandidates(): string[] {
  const candidates = new Set<string>();

  const override =
    process.env.EXPO_PUBLIC_ROADSYNC_SERVER_URL ||
    process.env.ROADSYNC_SERVER_URL;

  if (override) {
    candidates.add(override);
  }

  const hostUri =
    (Constants as typeof Constants & { expoConfig?: { hostUri?: string } })
      .expoConfig?.hostUri ||
    (Constants as typeof Constants & { manifest?: { debuggerHost?: string } })
      .manifest?.debuggerHost;

  if (typeof hostUri === "string" && hostUri.includes(":")) {
    const host = hostUri.split(":")[0];
    candidates.add(`http://${host}:3001`);
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    const originHost = window.location.origin.replace(/^https?:\/\//, "");
    const host = originHost.replace(/:\d+$/, "");
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      candidates.add(`http://${host}:3001`);
    }
  }

  candidates.add("http://192.168.1.106:3001");
  candidates.add("http://127.0.0.1:3001");
  candidates.add("http://10.0.2.2:3001");

  return Array.from(candidates);
}

let activeServerUrl = getServerUrlCandidates()[0];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const candidates = getServerUrlCandidates();
  const orderedCandidates = activeServerUrl
    ? [
        activeServerUrl,
        ...candidates.filter((candidate) => candidate !== activeServerUrl),
      ]
    : candidates;

  for (const candidate of orderedCandidates) {
    try {
      const healthResponse = await fetch(`${candidate}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!healthResponse.ok) {
        continue;
      }

      activeServerUrl = candidate;

      const response = await fetch(`${candidate}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data as T;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Unable to reach the RoadSync server.");
}

async function getTripFromServer(code: string): Promise<RoadTrip | undefined> {
  try {
    const trip = await requestJson<RoadTrip>(
      `/trips/${encodeURIComponent(code)}`,
    );
    tripStore.set(code.trim(), trip);
    return trip;
  } catch {
    return undefined;
  }
}

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
  const baseLocation = routeData.coordinates[0] ?? {
    latitude: routeData.centerLatitude,
    longitude: routeData.centerLongitude,
  };

  const fallbackTrip: RoadTrip = {
    id: generateTripId(normalizedName),
    name: normalizedName,
    tripCode: generateNumericCode(),
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

  try {
    const createdTrip = await requestJson<RoadTrip>("/trips", {
      method: "POST",
      body: JSON.stringify({
        name: normalizedName,
        hostName: normalizedHost,
        mapUrl: input.mapUrl,
      }),
    });

    tripStore.set(createdTrip.tripCode, createdTrip);
    return createdTrip;
  } catch {
    tripStore.set(fallbackTrip.tripCode, fallbackTrip);
    return fallbackTrip;
  }
}

export async function getTripByCode(
  code: string,
): Promise<RoadTrip | undefined> {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return undefined;
  }

  try {
    const trip = await requestJson<RoadTrip>(
      `/trips/${encodeURIComponent(normalizedCode)}`,
    );
    tripStore.set(normalizedCode, trip);
    return trip;
  } catch {
    return tripStore.get(normalizedCode);
  }
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
    const result = await requestJson<{
      trip: RoadTrip;
      participant: TripMember;
    }>("/trips/join", {
      method: "POST",
      body: JSON.stringify({ code, travelerName }),
    });

    if (result.trip) {
      tripStore.set(result.trip.tripCode, result.trip);
    }

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
  try {
    const updatedTrip = await requestJson<RoadTrip>(
      `/trips/${encodeURIComponent(code)}/status`,
      {
        method: "POST",
        body: JSON.stringify({ participantId, status }),
      },
    );

    tripStore.set(code.trim(), updatedTrip);
    return updatedTrip;
  } catch {
    const trip = tripStore.get(code.trim());

    if (!trip) {
      return undefined;
    }

    trip.participants = trip.participants.map((participant) =>
      participant.id === participantId
        ? { ...participant, status }
        : participant,
    );

    return trip;
  }
}

export async function leaveTrip(
  code: string,
  participantId: string,
): Promise<RoadTrip | undefined> {
  try {
    const updatedTrip = await requestJson<RoadTrip>(
      `/trips/${encodeURIComponent(code)}/leave`,
      {
        method: "POST",
        body: JSON.stringify({ participantId }),
      },
    );

    tripStore.set(code.trim(), updatedTrip);
    return updatedTrip;
  } catch {
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
}

export async function endTrip(code: string): Promise<RoadTrip | undefined> {
  try {
    const updatedTrip = await requestJson<RoadTrip>(
      `/trips/${encodeURIComponent(code)}/end`,
      {
        method: "POST",
      },
    );

    tripStore.set(code.trim(), updatedTrip);
    return updatedTrip;
  } catch {
    const trip = tripStore.get(code.trim());

    if (!trip) {
      return undefined;
    }

    trip.status = "ended";
    trip.notes = "The host ended this trip.";
    return trip;
  }
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
