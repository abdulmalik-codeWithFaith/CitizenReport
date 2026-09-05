# CitizenReport — Citizen Reporting Solution
Cordova mobile app · Bincom ICT Mobile App Class Assessment

A cross-platform mobile app where citizens report incidents (accidents,
fighting, rioting, robbery, fire, other) with a photo and automatic GPS
location, and browse a live feed of incidents reported by others.

---

## 1. Tech stack

- Apache Cordova (Android target)
- HTML / CSS / Vanilla JavaScript
- Firebase Authentication (email/password)
- Cloud Firestore (incident + user data)
- Firebase Storage (incident photos)
- Local notifications (`cordova-plugin-local-notification`) for "new incident" alerts
- Cordova Geolocation plugin
- Cordova Camera plugin

---

## 2. Project structure

```
CitizenReport/
├── config.xml              Cordova app config, permissions, plugins
├── package.json             npm/Cordova dependency manifest
├── firestore.rules          Firestore security rules
├── storage.rules             Firebase Storage security rules
└── www/                      Your actual app (this is what runs on the device)
    ├── index.html            All screens (single HTML file, JS shows/hides them)
    ├── css/style.css         All app styling
    └── js/
        ├── firebase-config.js   <-- PUT YOUR FIREBASE KEYS HERE
        ├── ui.js                Screen navigation, toasts, loaders
        ├── auth.js               Register / login / logout
        ├── geolocation.js         GPS wrapper
        ├── camera.js              Camera / gallery wrapper
        ├── notifications.js       New-incident local notifications
        ├── incidents.js           Firestore/Storage CRUD + live feed
        └── app.js                 Wires everything together
```

`platforms/` and `plugins/` folders are NOT included — Cordova generates
these automatically from `config.xml` when you run `cordova platform add`
and `cordova prepare`. Don't commit them to GitHub (see `.gitignore` below).

---

## 3. One-time local setup

You'll need, at minimum:
- Node.js + npm
- Cordova CLI: `npm install -g cordova`

To actually run on Android or build an APK, you additionally need:
- Java JDK 17
- Android Studio + Android SDK (Platform Tools, Build Tools, an API 34 platform)

### Getting this project running

```bash
# from inside the CitizenReport folder
npm install -g cordova        # if you don't already have it
cordova platform add android  # or `cordova platform add browser` to test without Android SDK
cordova plugin add cordova-plugin-geolocation
cordova plugin add cordova-plugin-camera
cordova plugin add cordova-plugin-file
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-network-information
cordova plugin add cordova-plugin-local-notification
cordova plugin add cordova-plugin-device
```

(All of these are already declared in `config.xml`, so `cordova prepare` will
also pull them in automatically the first time you build.)

Run in browser (fastest way to iterate on UI, no Android SDK required):
```bash
cordova run browser
```

Run on a real Android device or emulator:
```bash
cordova run android
```

---

## 4. Firebase setup (required before anything works)

1. Go to https://console.firebase.google.com and create a new project.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database → start in production mode.
4. **Storage** → Get started (default bucket is fine).
5. Project settings (gear icon) → General → "Your apps" → Add app → **Web** (`</>`).
   Register the app (nickname can be anything, no need for Firebase Hosting).
6. Copy the config object Firebase shows you and paste the values into:
   `www/js/firebase-config.js`

   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

   These values are safe to ship in a client app — they identify your
   project, they are not secret credentials. Real protection comes from the
   security rules below.

7. Deploy the security rules (or paste them manually in the console):

   Firestore: console → Firestore Database → Rules tab → paste contents of
   `firestore.rules` → Publish.

   Storage: console → Storage → Rules tab → paste contents of
   `storage.rules` → Publish.

   These rules ensure a user can only edit or delete **their own** incident
   reports, and that uploaded files must actually be images.

8. Create a Firestore **composite/simple index** if prompted: the feed query
   (`orderBy('createdAt', 'desc')`) works with Firestore's automatic single-field
   index, so normally no manual index is needed. If Firestore's console shows
   an "index required" link in an error, just click it — it creates itself.

---

## 5. Firestore data model

```
users/{userId}
  name          string
  email         string
  createdAt     timestamp

incidents/{incidentId}
  title         string
  description   string
  category      string   (Accident | Fighting | Rioting | Robbery | Fire | Other)
  imageUrl      string | null
  latitude      number
  longitude     number
  location      string   ("lat, lng" formatted for display)
  reporterId    string   (matches auth uid)
  reporterName  string
  createdAt     timestamp (serverTimestamp)
```

---

## 6. Notifications — how they work here

True push notifications that arrive even when the app is fully closed
require a server-side trigger (a Firebase Cloud Function listening for new
Firestore documents, which then calls FCM). That's a backend component
outside a client-only Cordova assessment build.

Instead, this app uses **local notifications**: a live Firestore listener
watches the `incidents` collection while the app is open, and fires a native
device notification the instant another user's report comes in. This
satisfies the "notify on new incident" requirement without needing a
deployed backend or a Firebase paid plan.

To extend this to real background push later, you'd add:
1. A Cloud Function (`onCreate` trigger on `incidents/{id}`) that sends an
   FCM message to a topic, e.g. `all-incidents`.
2. `cordova-plugin-firebasex` (or similar) on the client to subscribe to
   that topic and receive the push even when the app is closed.

---

## 7. Testing checklist (Step 14 equivalent)

- [ ] Register a new account → profile appears in Firestore `users/`
- [ ] Log out, log back in
- [ ] Submit an incident with a photo → appears at top of feed instantly
- [ ] Submit an incident without a photo → shows category icon placeholder instead
- [ ] Deny location permission once → see the friendly error + Retry button
- [ ] Filter feed by each category chip
- [ ] Tap an incident → detail screen shows photo, description, coordinates, "Open in Maps"
- [ ] Open "Mine" tab → only your own reports appear
- [ ] With two accounts/devices, submit from one → confirm the other gets a notification
- [ ] Turn off wifi mid-submit → confirm a friendly error toast, not a crash

---

## 8. Building the Android APK (Step 15 equivalent)

### Option A — No local install: let GitHub build it for you (recommended)

This repo includes `.github/workflows/build-apk.yml`, a GitHub Actions
workflow that builds the debug APK automatically using GitHub's own cloud
servers (which already have the Android SDK and JDK installed — you install
nothing locally).

1. Push this project to a GitHub repository (create one if you haven't:
   github.com → New repository → push this folder to it).
2. Go to your repo on GitHub → **Actions** tab.
3. You should see a run called **"Build Android APK"** either already running
   (it triggers automatically on push) or available to trigger manually via
   **Run workflow**.
4. Once it finishes (green checkmark, a few minutes), click into the run →
   scroll to **Artifacts** → download **app-debug-apk**.
5. Unzip it — inside is `app-debug.apk`. This is the file to place in your
   Google Drive submission folder alongside `www/`, `config.xml`, etc.

Note: this builds a **debug** APK (unsigned, fine for coursework/assessment
review — assessors can install it directly on an Android device with
"install from unknown sources" allowed). It does not require a Firebase
paid plan or any secrets — your Firebase web config in
`www/js/firebase-config.js` just needs to be filled in before you push,
since that's what ships inside the APK.

### Option B — Build locally

Once Android Studio + SDK are installed and `cordova requirements` shows all
green:

```bash
cordova platform add android     # if not already added
cordova build android             # debug APK
```

The debug APK will be at:
```
platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

For a signed release APK:
```bash
cordova build android --release
```
then sign it with your own keystore (`jarsigner` / `apksigner`) per Android's
standard release-signing process.

---

## 9. What to submit to Bincom (Step 16 equivalent)

Submit the whole project folder (or a GitHub repo link) **excluding**
`platforms/`, `plugins/`, and `node_modules/` — those are auto-generated.
Include:

- `config.xml`
- `package.json`
- `www/` (all source)
- `firestore.rules`, `storage.rules`
- `README.md`
- The built `app-debug.apk` (or a link to it), so assessors can install it
  directly without rebuilding

Suggested `.gitignore`:
```
platforms/
plugins/
node_modules/
*.apk
.DS_Store
```
(Feel free to remove `*.apk` from `.gitignore` if you want to commit the built
APK for the submission itself.)
