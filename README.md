# RoadSync

RoadSync is a mobile ride navigation and trip coordination app built with Expo and React Native.

The current app includes onboarding, Firebase email authentication, a home dashboard, profile editing, and trip creation and joining flows.

## Current Scope

RoadSync currently uses a lightweight local Node.js API for trip data and Firebase for email authentication and user profiles.

- Start the local API with `node scripts/roadsync-server.js` when you want trips to persist in `app-data/roadsync-store.json`.
- If the local API is unavailable, trip creation and trip details fall back to an in-memory store for the current app session.
- Firebase configuration is loaded from `firebase-config.ts`; authentication uses Firebase Authentication and profiles use Firestore.
- Profile image data is stored locally on the device with AsyncStorage.
- Google Maps links are parsed for route names and coordinates; a Google Maps API integration is not implemented.
- Google and Apple authentication buttons are currently frontend placeholders.

## Features

### Onboarding

- Image carousel with local assets
- Gradient presentation
- Animated slide transitions
- Get Started navigation

### Authentication

- Login and signup modes
- Firebase email authentication and Firestore username persistence
- Google and Apple sign-in placeholders
- Navigation to the home screen

### Home

- RoadSync dashboard
- Profile shortcut
- Active trip empty state
- Create Trip and Join Trip actions anchored at the bottom

### Profile

- Edit username
- Save Changes action with in-app confirmation
- Pick and locally persist a profile image
- Display registered email
- Log out and return to authentication

### Create Trip

- Required trip name
- Current user displayed as trip admin
- Temporary trip code generation
- Optional Google Maps URL
- Optional future date and time scheduling
- Validation for missing fields, invalid URLs, and past schedules
- Discard confirmation when cancelling a partially completed form
- Local API trip creation with an in-memory fallback

### Trip Details

- Trip creation confirmation
- Trip name, admin, schedule, and route summary
- Prominent trip code
- Copy Code action
- View Route placeholder
- Participant and trip status sections

## Tech Stack

- Expo SDK 57
- React Native 0.86
- React 19.2
- Expo Router
- TypeScript
- Firebase Authentication and Firestore
- AsyncStorage
- React Native DateTimePicker
- Expo Clipboard
- React Native Maps
- Expo Linear Gradient
- Expo Image Picker

## Getting Started

### Requirements

- Node.js compatible with Expo SDK 57
- npm
- Expo Go, an iOS simulator, an Android emulator, or a development build

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npx expo start
```

The app automatically checks for the local trip API on port `3001`. To enable persistent local trip data, run the API in a second terminal:

```bash
node scripts/roadsync-server.js
```

To set an explicit API URL in PowerShell:

```powershell
$env:EXPO_PUBLIC_ROADSYNC_SERVER_URL = "http://192.168.1.10:3001"
npx expo start
```

Useful platform commands:

```bash
npm run ios
npm run android
npm run web
```

To clear the Metro cache:

```bash
npx expo start --clear
```

### Firebase configuration

Email authentication and Firestore profiles require a Firebase project. Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to enable Email/Password authentication and Firestore, then set the project configuration in `firebase-config.ts`. Do not use Firestore test rules outside local development.

## Project Structure

```text
app/
   _layout.tsx             Expo Router stack configuration
   (tabs)/                 Onboarding and tab routes
   auth.tsx                Login and signup UI
   home.tsx                Home dashboard
   create-trip.tsx         Create Trip form
   join-trip.tsx           Join Trip flow
   profile.tsx             Profile editing and local persistence
   trip/[id].tsx           Trip Details screen

app-data/
   roadsync.ts              Trip types, API client, fallback store, and route parsing
   roadsync-store.json      Local API trip data

components/
   roadsync/
      action-button.tsx      Shared RoadSync action button
      screen.tsx             Shared safe-area screen and section layout
   route-map*.tsx           Route map implementations and fallback

constants/
   theme.ts                 Theme constants

hooks/
   use-color-scheme.ts      Color scheme helpers
   use-theme-color.ts       Theme color helper

assets/images/             Local onboarding and app imagery
scripts/
   roadsync-server.js       Local trip API
```

## Trip Data and API Behavior

Trip data is represented by the `RoadTrip` type in `app-data/roadsync.ts`. The app attempts to use the local API for creating, joining, reading, and updating trips. The API exposes health, trip creation, trip lookup, join, participant status, leave, and end-trip endpoints.

The local API stores records in `app-data/roadsync-store.json`. When the API cannot be reached, the client uses an in-memory fallback for supported flows; fallback data is lost when the app restarts.

The main trip shape is:

```ts
{
   id: "weekend-trip-...",
   name: "Weekend Trip",
   tripCode: "12345",
   hostName: "Current User",
   isScheduled: false,
   scheduledDate: null,
   scheduledTime: null,
   routeData: { rawUrl: "", destinationName: "Destination" },
   participants: [],
   stops: [],
   status: "active"
}
```

Firebase trip service functions are also present in `firebase-service.ts`, but the current trip screens use the local API client in `app-data/roadsync.ts`.

## Validation and Verification

Run the project lint check:

```bash
npm run lint
```

Build an iOS export:

```bash
npx expo export --platform ios --output-dir dist-ios
```

The lint command is the project’s current automated check. Export directories such as `dist-ios` and `dist-web` are generated build output and are not source code.

## Development Notes

- Use `react-native-safe-area-context` for safe-area handling.
- Keep local API behavior and Firebase behavior documented separately until the trip backend is consolidated.
- Avoid committing production Firebase configuration or credentials.
- Native modules such as DateTimePicker and Clipboard may require a rebuild when testing in a custom development build.

## Future Work

- Move trip persistence from the local Node.js API to a production backend
- Consolidate trip operations in one service layer
- Add admin approval and participant removal
- Integrate Google Maps route display and deep links
- Add real-time trip status and location updates
