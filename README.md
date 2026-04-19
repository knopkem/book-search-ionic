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

## Production build (Google Play Store)

A production release requires a signed Android App Bundle (AAB), which is the format expected by the Play Store.

**1. Build the web assets and sync:**

```bash
npm run build
npx cap sync android
```

**2. Build the release AAB:**

```bash
cd android
JAVA_HOME=/path/to/jdk-23 bash gradlew bundleRelease
```

The unsigned bundle is output to:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

**3. Sign the bundle with your upload key:**

This project uses **Google Play App Signing**. Google holds the actual app signing key; you only need your *upload key* to authenticate uploads. Google re-signs the bundle before it reaches users.

If you don't have an upload keystore yet (new setup or after a key reset), create one:

```bash
keytool -genkey -v -keystore upload.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Sign the AAB:

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore upload.keystore \
  android/app/build/outputs/bundle/release/app-release.aab \
  upload
```

> ⚠️ Back up `upload.keystore` securely (password manager, encrypted storage). If you lose it, see [Lost upload key](#lost-upload-key) below.

**4. Upload** the signed `.aab` file in the Google Play Console under the relevant release track (internal, beta, or production).

## Lost upload key

Because this app uses Google Play App Signing, a lost upload key can be recovered — Google controls the real signing key, so the app's identity is not at risk.

**1. Generate a new upload key:**

```bash
keytool -genkey -v -keystore upload.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

**2. Export the public certificate:**

```bash
keytool -export -rfc \
  -keystore upload.keystore -alias upload \
  -file upload_certificate.pem
```

**3. Request a reset in Play Console:**

1. Open Play Console → your app → **Release → Setup → App signing**
2. Scroll to **"Request upload key reset"**
3. Upload `upload_certificate.pem` and submit

Google typically approves the request within a few days and sends an email confirmation. Once approved, sign future AABs with the new `upload.keystore` as shown in [Production build](#production-build-google-play-store).

## Updating the version

The Android version is defined in two places in `android/app/build.gradle`:

```groovy
versionCode 7      // integer, must increase with every upload to the Play Store
versionName '7.0'  // human-readable string shown to users
```

Update both values before building a new release:

- **`versionCode`** — increment by at least 1 each time you upload a new build.
- **`versionName`** — use any human-readable string, e.g. `'1.2.0'`.

Optionally keep `package.json` in sync:

```json
"version": "1.2.0"
```

After updating, rebuild and re-sign following the [Production build](#production-build-google-play-store) steps above.

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
