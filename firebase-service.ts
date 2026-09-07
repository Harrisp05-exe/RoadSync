import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from "firebase/firestore";
import { db } from "./firebase-config";

// ===== TRIP OPERATIONS =====

export async function createTrip(userId: string, tripData: any) {
  try {
    const tripId = doc(collection(db, "trips")).id;
    const tripRef = doc(db, "trips", tripId);

    await setDoc(tripRef, {
      id: tripId,
      ...tripData,
      hostId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return tripId;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getTripByCode(tripCode: string) {
  try {
    const q = query(collection(db, "trips"), where("tripCode", "==", tripCode));
    const snap = await getDocs(q);
    return snap.docs[0]?.data();
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getTripById(tripId: string) {
  try {
    const tripRef = doc(db, "trips", tripId);
    const snap = await getDoc(tripRef);
    return snap.data();
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateTrip(tripId: string, updates: any) {
  try {
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function endTrip(tripId: string) {
  try {
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, {
      status: "ended",
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export function subscribeToTrip(tripId: string, callback: (trip: any) => void) {
  try {
    const tripRef = doc(db, "trips", tripId);
    return onSnapshot(tripRef, (snap) => {
      callback(snap.data());
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getUserTrips(userId: string) {
  try {
    const q = query(collection(db, "trips"), where("hostId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// ===== TRIP PARTICIPANTS =====

export async function addTripParticipant(
  tripId: string,
  userId: string,
  participantData: any,
) {
  try {
    const participantId = `${tripId}_${userId}`;
    const participantRef = doc(db, "tripParticipants", participantId);

    await setDoc(participantRef, {
      id: participantId,
      tripId,
      userId,
      ...participantData,
      joinedAt: Timestamp.now(),
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateParticipantStatus(
  tripId: string,
  userId: string,
  status: string,
  location?: { latitude: number; longitude: number },
) {
  try {
    const participantId = `${tripId}_${userId}`;
    const participantRef = doc(db, "tripParticipants", participantId);

    await updateDoc(participantRef, {
      status,
      ...(location && {
        latitude: location.latitude,
        longitude: location.longitude,
        lastLocationUpdate: Timestamp.now(),
      }),
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getTripParticipants(tripId: string) {
  try {
    const q = query(
      collection(db, "tripParticipants"),
      where("tripId", "==", tripId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export function subscribeToTripParticipants(
  tripId: string,
  callback: (participants: any[]) => void,
) {
  try {
    const q = query(
      collection(db, "tripParticipants"),
      where("tripId", "==", tripId),
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((doc) => doc.data()));
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function leaveTrip(tripId: string, userId: string) {
  try {
    const participantId = `${tripId}_${userId}`;
    const participantRef = doc(db, "tripParticipants", participantId);
    await deleteDoc(participantRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// ===== TRIP STOPS =====

export async function createTripStop(tripId: string, stopData: any) {
  try {
    const stopId = `${tripId}_${stopData.index}`;
    const stopRef = doc(db, "tripStops", stopId);

    await setDoc(stopRef, {
      id: stopId,
      tripId,
      ...stopData,
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getTripStops(tripId: string) {
  try {
    const q = query(collection(db, "tripStops"), where("tripId", "==", tripId));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => doc.data())
      .sort((a, b) => (a.index || 0) - (b.index || 0));
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateTripStop(
  tripId: string,
  stopIndex: number,
  updates: any,
) {
  try {
    const stopId = `${tripId}_${stopIndex}`;
    const stopRef = doc(db, "tripStops", stopId);

    await updateDoc(stopRef, updates);
  } catch (error: any) {
    throw new Error(error.message);
  }
}
