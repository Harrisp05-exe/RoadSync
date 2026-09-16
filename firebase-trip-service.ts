import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    runTransaction,
    Timestamp,
    updateDoc,
} from "firebase/firestore";

import type {
    RoadTrip,
    TripLocation,
    TripMember,
    TripMemberStatus,
    TripRouteData,
    TripStop,
} from "./app-data/roadsync";
import { auth, db } from "./firebase-config";

type CreateSharedTripInput = {
  name: string;
  hostName: string;
  routeData: TripRouteData;
  stops: TripStop[];
  isScheduled: boolean;
  scheduledDate: string | null;
  scheduledTime: string | null;
};

type FirestoreParticipant = Omit<TripMember, "location" | "joinedAt"> & {
  latitude: number;
  longitude: number;
  joinedAt: Timestamp;
  lastLocationUpdate?: Timestamp;
};

type FirestoreTrip = Omit<RoadTrip, "participants"> & {
  hostId: string;
  isStarted: boolean;
  startedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function requireUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please log in before using shared trips.");
  }
  return user;
}

function generateTripCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

function timestampToIso(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
}

function participantFromData(
  id: string,
  data: FirestoreParticipant,
): TripMember {
  return {
    id,
    name: data.name,
    role: data.role,
    status: data.status,
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
    },
    isActive: data.isActive,
    joinedAt: timestampToIso(data.joinedAt),
  };
}

function tripFromData(
  data: FirestoreTrip,
  participants: TripMember[],
): RoadTrip {
  return {
    id: data.id,
    name: data.name,
    tripCode: data.tripCode,
    hostName: data.hostName,
    isScheduled: data.isScheduled,
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime,
    routeData: data.routeData,
    participants,
    stops: data.stops,
    status: data.status,
    isStarted: data.isStarted,
    startedAt: data.startedAt ? timestampToIso(data.startedAt) : null,
    safetyStatus: data.safetyStatus,
    nextStop: data.nextStop,
    notes: data.notes,
  };
}

async function getTripFromSnapshot(
  tripId: string,
  tripSnapshot?: Awaited<ReturnType<typeof getDoc>>,
): Promise<RoadTrip | undefined> {
  const snapshot = tripSnapshot ?? (await getDoc(doc(db, "trips", tripId)));
  if (!snapshot.exists()) {
    return undefined;
  }

  const participantSnapshot = await getDocs(
    collection(db, "trips", tripId, "participants"),
  );
  const participants = participantSnapshot.docs.map((participant) =>
    participantFromData(
      participant.id,
      participant.data() as FirestoreParticipant,
    ),
  );

  return tripFromData(snapshot.data() as FirestoreTrip, participants);
}

export async function createSharedTrip(
  input: CreateSharedTripInput,
): Promise<RoadTrip> {
  const user = requireUser();
  const tripRef = doc(collection(db, "trips"));
  const participantRef = doc(db, "trips", tripRef.id, "participants", user.uid);
  const baseLocation: TripLocation = input.routeData.coordinates[0] ?? {
    latitude: input.routeData.centerLatitude,
    longitude: input.routeData.centerLongitude,
  };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const tripCode = generateTripCode();
    const codeRef = doc(db, "tripCodes", tripCode);
    const createdAt = Timestamp.now();

    try {
      await runTransaction(db, async (transaction) => {
        const codeSnapshot = await transaction.get(codeRef);
        if (codeSnapshot.exists()) {
          throw new Error("TRIP_CODE_TAKEN");
        }

        const trip: FirestoreTrip = {
          id: tripRef.id,
          name: input.name,
          tripCode,
          hostId: user.uid,
          hostName: input.hostName,
          isScheduled: input.isScheduled,
          scheduledDate: input.scheduledDate,
          scheduledTime: input.scheduledTime,
          routeData: input.routeData,
          stops: input.stops,
          status: "active",
          isStarted: false,
          startedAt: null,
          safetyStatus: "All clear",
          nextStop: input.routeData.destinationName,
          notes: `${input.hostName} created this shared trip.`,
          createdAt,
          updatedAt: createdAt,
        };

        transaction.set(codeRef, {
          tripId: tripRef.id,
          status: "active",
          createdAt,
        });
        transaction.set(tripRef, trip);
        transaction.set(participantRef, {
          id: user.uid,
          tripId: tripRef.id,
          name: input.hostName,
          role: "Host",
          status: "Waiting",
          latitude: baseLocation.latitude,
          longitude: baseLocation.longitude,
          isActive: true,
          joinedAt: createdAt,
        });
      });

      return (await getTripFromSnapshot(tripRef.id)) as RoadTrip;
    } catch (error) {
      if (error instanceof Error && error.message === "TRIP_CODE_TAKEN") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to generate a unique trip code. Please try again.");
}

export async function getSharedTripByCode(
  tripCode: string,
): Promise<RoadTrip | undefined> {
  requireUser();
  const normalizedCode = tripCode.trim().toUpperCase();
  const codeSnapshot = await getDoc(doc(db, "tripCodes", normalizedCode));
  if (!codeSnapshot.exists()) {
    return undefined;
  }

  const tripId = String(codeSnapshot.data().tripId || "");
  return tripId ? getTripFromSnapshot(tripId) : undefined;
}

export async function joinSharedTrip(
  tripCode: string,
  travelerName: string,
): Promise<{ trip: RoadTrip; participant: TripMember }> {
  const user = requireUser();
  const normalizedCode = tripCode.trim().toUpperCase();
  const codeSnapshot = await getDoc(doc(db, "tripCodes", normalizedCode));
  if (!codeSnapshot.exists()) {
    throw new Error("That trip code was not found. Please try again.");
  }

  const tripId = String(codeSnapshot.data().tripId || "");
  const tripRef = doc(db, "trips", tripId);
  const participantRef = doc(db, "trips", tripId, "participants", user.uid);
  const joinedAt = Timestamp.now();

  await runTransaction(db, async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);
    if (!tripSnapshot.exists() || tripSnapshot.data().status !== "active") {
      throw new Error("This trip has already ended.");
    }

    transaction.set(participantRef, {
      id: user.uid,
      tripId,
      name: travelerName.trim(),
      role: "Traveler",
      status: "Waiting",
      latitude: tripSnapshot.data().routeData.centerLatitude,
      longitude: tripSnapshot.data().routeData.centerLongitude,
      isActive: true,
      joinedAt,
    });
  });

  const trip = await getTripFromSnapshot(tripId);
  if (!trip) {
    throw new Error("Unable to load the shared trip.");
  }

  const participant = trip.participants.find((item) => item.id === user.uid);
  if (!participant) {
    throw new Error("Unable to add you to the shared trip.");
  }

  return { trip, participant };
}

export async function updateSharedParticipantStatus(
  tripId: string,
  status: TripMemberStatus,
  location?: TripLocation,
) {
  const user = requireUser();
  await updateDoc(doc(db, "trips", tripId, "participants", user.uid), {
    status,
    ...(location && {
      latitude: location.latitude,
      longitude: location.longitude,
    }),
    lastLocationUpdate: Timestamp.now(),
  });
}

export async function startSharedTrip(tripId: string) {
  const user = requireUser();
  const tripSnapshot = await getDoc(doc(db, "trips", tripId));
  if (!tripSnapshot.exists() || tripSnapshot.data().hostId !== user.uid) {
    throw new Error("Only the trip host can start this trip.");
  }

  await updateDoc(doc(db, "trips", tripId), {
    isStarted: true,
    startedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    notes: "The host started this trip.",
  });
}

export async function leaveSharedTrip(tripId: string) {
  const user = requireUser();
  await deleteDoc(doc(db, "trips", tripId, "participants", user.uid));
}

export async function endSharedTrip(tripId: string) {
  const user = requireUser();
  const existingTrip = await getDoc(doc(db, "trips", tripId));
  if (!existingTrip.exists() || existingTrip.data().hostId !== user.uid) {
    throw new Error("Only the trip host can end this trip.");
  }
  await updateDoc(doc(db, "trips", tripId), {
    status: "ended",
    updatedAt: Timestamp.now(),
  });
  const tripSnapshot = await getDoc(doc(db, "trips", tripId));
  const tripCode = tripSnapshot.data()?.tripCode;
  if (typeof tripCode === "string") {
    await updateDoc(doc(db, "tripCodes", tripCode), {
      status: "ended",
    });
  }
}

export function subscribeToSharedTrip(
  tripId: string,
  callback: (trip: RoadTrip) => void,
  onError?: (error: Error) => void,
) {
  let tripData: FirestoreTrip | undefined;
  let participants: TripMember[] = [];

  const emit = () => {
    if (tripData) {
      callback(tripFromData(tripData, participants));
    }
  };

  const tripUnsubscribe = onSnapshot(
    doc(db, "trips", tripId),
    (snapshot) => {
      if (snapshot.exists()) {
        tripData = snapshot.data() as FirestoreTrip;
        emit();
      }
    },
    (error) => onError?.(error),
  );

  const participantsUnsubscribe = onSnapshot(
    collection(db, "trips", tripId, "participants"),
    (snapshot) => {
      participants = snapshot.docs.map((participant) =>
        participantFromData(
          participant.id,
          participant.data() as FirestoreParticipant,
        ),
      );
      emit();
    },
    (error) => onError?.(error),
  );

  return () => {
    tripUnsubscribe();
    participantsUnsubscribe();
  };
}
