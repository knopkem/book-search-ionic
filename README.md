# book-search-ionic

Read-only mobile client for the Book Search system.

This app is built with **Ionic React + Capacitor** and is intended to let a user browse their synced book list on a phone, including offline after a successful synchronization.

## What it does

- signs in with **Google** on Android
- exchanges the Google ID token with `book-search-server`
- syncs the current user's books from the server
- caches books locally with `@ionic/storage`
- allows offline browsing and search of the last synced data

The app is intentionally focused on **reading and searching**, not editing.

## Related server

This app is meant to work with the backend:

```text
https://github.com/knopkem/book-search-server
```

The current mobile flow is:

1. Native Google Sign-In in the app
2. `POST /api/auth/google/mobile` on the server
3. `GET /books` with the returned bearer token
4. Local caching for offline access

## Requirements

- Node.js / npm
- Android toolchain for native builds
- **JDK 23 or JDK 21** for Android builds

Java 24 is currently not compatible with the Android build in this project.

## Configuration

Copy the example env file:

```bash
cp .env.example .env
```

Set the server URL:

```env
VITE_API_BASE_URL=http://localhost:3000
```

For local development this should point at a running `book-search-server` instance.

## Google Sign-In setup

This app expects Google Sign-In to be configured in Google Cloud for Android.

Important pieces:

- Android package ID: `com.pacsnode.booksearch`
- matching SHA certificate fingerprints for your debug/release app
- the server must also be configured with the correct `GOOGLE_CLIENT_ID`

Without that setup, sign-in will fail even if the app builds correctly.

## Install

```bash
npm install
```

## Development

Run the web/dev version:

```bash
npm run dev
```

This is useful for general UI work, but native Google Sign-In is only available in the native app shell.

## Checks

Lint:

```bash
npm run lint
```

Unit tests:

```bash
npm run test.unit -- --run
```

Production web build:

```bash
npm run build
```

## Android usage

Sync Capacitor with the Android project:

```bash
npx cap sync android
```

Build the Android debug app:

```bash
cd android
JAVA_HOME=/path/to/jdk-23 bash gradlew assembleDebug
```

If you already have a compatible JDK 21 or 23 selected globally, the explicit `JAVA_HOME` override is not necessary.

## Main behaviors

- On startup, the app restores the previous mobile session if present
- If a session exists, it automatically attempts a fresh sync
- If sync fails, cached books remain available
- If the mobile token is no longer valid, the app clears the session and asks the user to sign in again

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build the web assets |
| `npm run lint` | Run ESLint |
| `npm run test.unit -- --run` | Run Vitest once |
| `npx cap sync android` | Update the native Android project from web assets/config |

## Notes

- This app is **Android-focused** right now
- The old manual URL/token settings flow has been replaced
- Book editing belongs in the browser app served by `book-search-server`
