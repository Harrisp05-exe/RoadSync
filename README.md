# RoadSync

RoadSync is a mobile ride navigation and trip coordination app built as a frontend prototype with Expo and React Native.

The current app includes onboarding, authentication UI, a home dashboard, profile editing, and the first trip workflow: creating a trip with a temporary trip code.

## Current Scope

RoadSync is currently frontend-only.

- No backend service is required for the Create Trip flow.
- No database models or API endpoints are created by this project setup.
- Trips created from the Create Trip screen are stored in an in-memory mock store for the current app session.
- Profile email, username, and profile image data use AsyncStorage on the device.
- Google Maps links are stored and validated as URLs, but no Maps API integration is implemented yet.
- Google and Apple authentication buttons are currently frontend placeholders.

## Features

### Onboarding

- Image carousel with local assets
- Gradient presentation
- Animated slide transitions
- Get Started navigation

### Authentication

- Login and signup modes
- Local email and username persistence
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
- Temporary six-character trip code generation
- Optional Google Maps URL
- Optional future date and time scheduling
- Validation for missing fields, invalid URLs, and past schedules
- Discard confirmation when cancelling a partially completed form
- Frontend-only trip creation

### Trip Details

- Trip creation confirmation
- Trip name, admin, schedule, and route summary
- Prominent trip code
- Copy Code action
- View Route placeholder
- Participant and trip status sections for future functionality

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router
- TypeScript
- AsyncStorage
- React Native DateTimePicker
- Expo Clipboard
- React Native Maps
- Expo Linear Gradient
- Expo Image Picker

## Getting Started

### Requirements

- Node.js compatible with Expo SDK 54
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

## Project Structure

```text
app/
   _layout.tsx             Expo Router stack configuration
   (tabs)/                 Onboarding and tab routes
   auth.tsx                Login and signup UI
   home.tsx                Home dashboard
   create-trip.tsx         Frontend Create Trip form
   join-trip.tsx           Join Trip prototype route
   profile.tsx             Profile editing and local persistence
   trip/[id].tsx           Trip Details screen

app-data/
   roadsync.ts              Trip types, mock store, and route parsing

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
scripts/                   Local project scripts
```

## Frontend Trip State

Trip data is represented by the `RoadTrip` type in `app-data/roadsync.ts`. The Create Trip screen calls `createMockTrip`, which generates a local trip object and stores it in the module-level mock store.

The current shape is designed to make a future API integration straightforward:

```ts
{
   id: "weekend-trip-...",
   name: "Weekend Trip",
   tripCode: "ABC234",
   hostName: "Current User",
   isScheduled: false,
   scheduledDate: null,
   scheduledTime: null,
   routeData: {},
   participants: [],
   status: "active"
}
```

When a backend is introduced later, `createMockTrip` can be replaced by a repository or API implementation without changing the form layout or navigation contract.

## Validation and Verification

Run the project lint check:

```bash
npm run lint
```

Build an iOS export:

```bash
npx expo export --platform ios --output-dir dist-ios
```

The current project has one existing lint warning in `app/profile.tsx` for unused `username` state, but the trip feature itself has no lint errors.

## Development Notes

- Use `react-native-safe-area-context` for safe-area handling.
- Keep new trip functionality frontend-only until the backend contract is agreed.
- Avoid storing real credentials in the frontend prototype.
- Native modules such as DateTimePicker and Clipboard may require a rebuild when testing in a custom development build.
- The generated `dist-ios` directory is build output and does not represent source code.

## Future Work

- Connect authentication to a real identity provider
- Add backend-generated trip codes
- Persist trips remotely
- Implement Join Trip requests
- Add admin approval and participant removal
- Integrate Google Maps route display and deep links
- Add real-time trip status and location updates
