const fs = require("fs");
const path = require("path");
const http = require("http");

const PORT = Number(process.env.PORT || 3001);
const HOST = "0.0.0.0";
const STORE_PATH = path.resolve(__dirname, "../app-data/roadsync-store.json");

function generateNumericCode(length = 5) {
  return Array.from({ length }, () =>
    String(Math.floor(Math.random() * 10)),
  ).join("");
}

function generateTripId(name) {
  const normalized = String(name || "road-trip")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "road-trip";
}

function parseCoordinatePair(value) {
  const match = String(value).match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  return {
    latitude: Number(match[1]),
    longitude: Number(match[2]),
  };
}

function parseCoordinatesFromUrl(url) {
  const coordinates = [];
  const addCoordinate = (location) => {
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
    // Ignore malformed URLs.
  }

  return coordinates;
}

function getRouteCenter(coordinates, fallbackLocation) {
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

function parseGoogleMapsRoute(mapUrl) {
  const normalizedUrl = String(mapUrl || "").trim();
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

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function createTripRecord(payload) {
  const normalizedName = String(payload?.name || "").trim() || "Road Trip";
  const normalizedHost = String(payload?.hostName || "").trim() || "Host";
  const tripCode = generateNumericCode();
  const routeData = parseGoogleMapsRoute(payload?.mapUrl || "");
  const baseLocation = routeData.coordinates[0] || {
    latitude: routeData.centerLatitude,
    longitude: routeData.centerLongitude,
  };

  const trip = {
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

  return trip;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  const store = loadStore();

  if (req.method === "POST" && url.pathname === "/trips") {
    try {
      const payload = await readBody(req);
      const trip = createTripRecord(payload);
      store[trip.tripCode] = trip;
      saveStore(store);
      sendJson(res, 201, trip);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to create trip" });
    }
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/trips/")) {
    const tripCode = decodeURIComponent(
      url.pathname.split("/").filter(Boolean)[1] || "",
    );
    const trip = store[tripCode];

    if (!trip) {
      sendJson(res, 404, { error: "Trip not found" });
      return;
    }

    sendJson(res, 200, trip);
    return;
  }

  if (req.method === "POST" && url.pathname === "/trips/join") {
    try {
      const payload = await readBody(req);
      const trip = store[String(payload.code || "").trim()];

      if (!trip) {
        sendJson(res, 404, {
          error: "That trip code was not found. Please try again.",
        });
        return;
      }

      if (trip.status !== "active") {
        sendJson(res, 400, { error: "This trip has already ended." });
        return;
      }

      const normalizedName = String(payload.travelerName || "").trim();
      if (!normalizedName) {
        sendJson(res, 400, { error: "Please enter your name before joining." });
        return;
      }

      const isDuplicate = trip.participants.some(
        (participant) =>
          participant.name.toLowerCase() === normalizedName.toLowerCase(),
      );

      const resolvedName = isDuplicate
        ? `${normalizedName} ${trip.participants.length + 1}`
        : normalizedName;

      const participant = {
        id: `traveler-${Date.now()}`,
        name: resolvedName,
        role: "Traveler",
        status: "Waiting",
        location: trip.routeData.coordinates[0] || {
          latitude: trip.routeData.centerLatitude,
          longitude: trip.routeData.centerLongitude,
        },
        isActive: true,
        joinedAt: new Date().toISOString(),
      };

      trip.participants.push(participant);
      saveStore(store);
      sendJson(res, 200, { trip, participant });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to join trip" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.match(/^\/trips\/[^/]+\/status$/)) {
    try {
      const tripCode = decodeURIComponent(url.pathname.split("/")[2] || "");
      const payload = await readBody(req);
      const trip = store[tripCode];

      if (!trip) {
        sendJson(res, 404, { error: "Trip not found" });
        return;
      }

      trip.participants = trip.participants.map((participant) =>
        participant.id === payload.participantId
          ? { ...participant, status: payload.status }
          : participant,
      );
      saveStore(store);
      sendJson(res, 200, trip);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to update status" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.match(/^\/trips\/[^/]+\/leave$/)) {
    try {
      const tripCode = decodeURIComponent(url.pathname.split("/")[2] || "");
      const payload = await readBody(req);
      const trip = store[tripCode];

      if (!trip) {
        sendJson(res, 404, { error: "Trip not found" });
        return;
      }

      trip.participants = trip.participants.filter(
        (participant) => participant.id !== payload.participantId,
      );

      if (trip.participants.length === 0) {
        trip.status = "ended";
        trip.notes = "The trip has ended.";
      }

      saveStore(store);
      sendJson(res, 200, trip);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to leave trip" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.match(/^\/trips\/[^/]+\/end$/)) {
    try {
      const tripCode = decodeURIComponent(url.pathname.split("/")[2] || "");
      const trip = store[tripCode];

      if (!trip) {
        sendJson(res, 404, { error: "Trip not found" });
        return;
      }

      trip.status = "ended";
      trip.notes = "The host ended this trip.";
      saveStore(store);
      sendJson(res, 200, trip);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to end trip" });
    }
    return;
  }

  sendJson(res, 404, { error: "Route not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`RoadSync server listening on http://${HOST}:${PORT}`);
  console.log(`Store file: ${STORE_PATH}`);
});
