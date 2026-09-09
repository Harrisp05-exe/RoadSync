# Firebase Backend Setup for RoadSync

RoadSync already includes Firebase integration in `firebase-config.ts`, `firebase-auth.ts`, and `firebase-service.ts`. Use this guide to configure a Firebase project and verify the existing integration; do not create duplicate files unless the implementation has been removed.

The current app uses Firebase Authentication for email/password accounts and Firestore for user profiles. Trip screens currently use the local API described in the main [README](README.md), so the trip service functions in this file are available groundwork rather than the active trip data path.

## Phase 1: Create Firebase Project

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name: `roadsync` (or your choice)
4. Uncheck "Enable Google Analytics" (free tier doesn't need it)
5. Click "Create Project" → Wait for setup

### Step 2: Set Up Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select region: `us-central1` (closest to you)
4. Start in **TEST mode** (we'll secure it later)
5. Click "Enable"

### Step 3: Set Up Authentication

1. Go to **Build** → **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** provider
4. Save

### Step 4: Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click on the web app or create one
4. Copy the Firebase config

---

## Phase 2: Install Firebase in Your App

### Step 1: Install Firebase Package

```bash
npm install firebase
```

### Step 2: Create Firebase Configuration File

Create `firebase-config.ts`:

```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "roadsync-xxxxx.firebaseapp.com",
  projectId: "roadsync-xxxxx",
  storageBucket: "roadsync-xxxxx.appspot.com",
  messagingSenderId: "xxxxx",
  appId: "1:xxxxx:web:xxxxx",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

---

## Phase 3: Database Schema Design

### Collections Structure

```
roadsync/
├── users/
│   ├── {userId}
│   │   ├── email: string
│   │   ├── username: string
│   │   ├── profileImage: string (URL)
│   │   ├── createdAt: timestamp
│   │   └── updatedAt: timestamp
│
├── trips/
│   ├── {tripId}
│   │   ├── name: string
│   │   ├── tripCode: string (unique)
│   │   ├── hostId: string (userId reference)
│   │   ├── hostName: string
│   │   ├── status: "active" | "ended"
│   │   ├── isScheduled: boolean
│   │   ├── scheduledDate: timestamp
│   │   ├── scheduledTime: timestamp
│   │   ├── mapUrl: string
│   │   ├── safetyStatus: "All clear" | "Check-in due" | "Attention needed"
│   │   ├── nextStop: string
│   │   ├── notes: string
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── routeData (subcollection)
│   │       └── coordinates/
│   │           ├── latitude: number
│   │           ├── longitude: number
│   │           └── index: number
│
├── tripParticipants/
│   ├── {tripId}_{userId}
│   │   ├── tripId: string
│   │   ├── userId: string
│   │   ├── name: string
│   │   ├── role: "Host" | "Traveler"
│   │   ├── status: "Waiting" | "Driving" | "SOS"
│   │   ├── latitude: number
│   │   ├── longitude: number
│   │   ├── isActive: boolean
│   │   ├── joinedAt: timestamp
│   │   └── lastLocationUpdate: timestamp
│
└── tripStops/
    ├── {tripId}_{stopIndex}
    │   ├── tripId: string
    │   ├── name: string
    │   ├── time: timestamp
    │   ├── status: "done" | "current" | "upcoming"
    │   └── index: number
```

---

## Phase 4: Firebase Security Rules

### Firestore Security Rules

Go to **Firestore** → **Rules** and replace with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Trips: host can manage, participants can read
    match /trips/{tripId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if
        resource.data.hostId == request.auth.uid;
    }

    // Trip Participants
    match /tripParticipants/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if
        request.auth.uid == resource.data.userId ||
        exists(/databases/$(database)/documents/trips/$(resource.data.tripId)) &&
        get(/databases/$(database)/documents/trips/$(resource.data.tripId)).data.hostId == request.auth.uid;
    }

    // Trip Stops
    match /tripStops/{document=**} {
      allow read: if request.auth != null;
      allow write: if
        exists(/databases/$(database)/documents/trips/$(resource.data.tripId)) &&
        get(/databases/$(database)/documents/trips/$(resource.data.tripId)).data.hostId == request.auth.uid;
    }
  }
}
```

---

## Phase 5: Firestore Indexes (for queries)

Firebase will auto-suggest these, but you can create them preemptively:

1. **Collection:** `trips`
   - Field: `status` (Ascending)
   - Field: `createdAt` (Descending)

2. **Collection:** `tripParticipants`
   - Field: `tripId` (Ascending)
   - Field: `joinedAt` (Descending)

---

## Phase 6: Firebase Service Functions

Create `firebase-service.ts`:

```typescript
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase-config";
import type { RoadTrip, TripMember, RoadUser } from "@/app-data/roadsync";

// ===== USER OPERATIONS =====
export async function createUser(
  userId: string,
  email: string,
  username: string,
) {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    email,
    username,
    profileImage: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function getUser(userId: string) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  return snap.data();
}

export async function updateUserProfile(userId: string, updates: any) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// ===== TRIP OPERATIONS =====
export async function createTrip(tripData: any) {
  const tripId = doc(collection(db, "trips")).id;
  const tripRef = doc(db, "trips", tripId);

  await setDoc(tripRef, {
    ...tripData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return tripId;
}

export async function getTripByCode(tripCode: string) {
  const q = query(collection(db, "trips"), where("tripCode", "==", tripCode));
  const snap = await getDocs(q);
  return snap.docs[0]?.data();
}

export async function getTripById(tripId: string) {
  const tripRef = doc(db, "trips", tripId);
  const snap = await getDoc(tripRef);
  return snap.data();
}

export async function updateTrip(tripId: string, updates: any) {
  const tripRef = doc(db, "trips", tripId);
  await updateDoc(tripRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function subscribeToTrip(
  tripId: string,
  callback: (trip: any) => void,
) {
  const tripRef = doc(db, "trips", tripId);
  return onSnapshot(tripRef, (snap) => {
    callback(snap.data());
  });
}

// ===== TRIP PARTICIPANTS =====
export async function addTripParticipant(
  tripId: string,
  userId: string,
  participantData: any,
) {
  const participantId = `${tripId}_${userId}`;
  const participantRef = doc(db, "tripParticipants", participantId);

  await setDoc(participantRef, {
    tripId,
    userId,
    ...participantData,
    joinedAt: Timestamp.now(),
  });
}

export async function updateParticipantStatus(
  tripId: string,
  userId: string,
  status: string,
  location?: { latitude: number; longitude: number },
) {
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
}

export async function getTripParticipants(tripId: string) {
  const q = query(
    collection(db, "tripParticipants"),
    where("tripId", "==", tripId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data());
}

export async function subscribeToTripParticipants(
  tripId: string,
  callback: (participants: any[]) => void,
) {
  const q = query(
    collection(db, "tripParticipants"),
    where("tripId", "==", tripId),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((doc) => doc.data()));
  });
}

// ===== TRIP STOPS =====
export async function createTripStop(tripId: string, stopData: any) {
  const stopId = `${tripId}_${stopData.index}`;
  const stopRef = doc(db, "tripStops", stopId);

  await setDoc(stopRef, {
    tripId,
    ...stopData,
  });
}

export async function getTripStops(tripId: string) {
  const q = query(collection(db, "tripStops"), where("tripId", "==", tripId));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data());
}

export async function updateTripStop(
  tripId: string,
  stopIndex: number,
  updates: any,
) {
  const stopId = `${tripId}_${stopIndex}`;
  const stopRef = doc(db, "tripStops", stopId);

  await updateDoc(stopRef, updates);
}
```

---

## Next Steps

1. ✅ Create Firebase project
2. ✅ Set up Firestore & Authentication
3. ✅ Install Firebase SDK
4. ✅ Create configuration files
5. ⏭️ **Replace mock data with Firebase calls** (Next guide)
6. ⏭️ Implement real-time location tracking
7. ⏭️ Set up push notifications

Ready to integrate this into your app?
