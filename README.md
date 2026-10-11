# Snapiano app (Expo SDK 57, TypeScript)

```
npm install
npx expo install i18next react-i18next expo-localization expo-updates
npx expo start
```
- Read `AGENTS.md` (Expo rules) and the root `CLAUDE.md` before writing code.
- Design: `../.claude/skills/piano-app-design/SKILL.md`, tokens in `src/theme/tokens.ts`.
- Text: edit the table in `tools/make_locales.py`, then `python tools/make_locales.py`.
- `prototypes/play_along_bach.html`: open in Chrome (MIDI and microphone need Chrome or Edge).
# snapiano

## Run on your phone

**Option A: Expo Go (fastest, no native modules)**
1. Install **Expo Go** from Google Play (Android) or the App Store (iOS).
2. Put the phone and the computer on the same Wi-Fi.
3. In `FE/`: `npm install`, then `npx expo start`.
4. Scan the QR code: Android with the Expo Go app, iPhone with the Camera app.
5. If the phone can't connect (office/guest Wi-Fi, VPN): `npx expo start --tunnel`.

Expo Go only runs the SDK it supports. If it says the project is incompatible, use option B.

**Option B: development build (needed for MIDI, microphone audio, other native modules)**
1. On the Android phone: Settings > About phone > tap *Build number* 7 times, then Developer options > enable **USB debugging**.
2. Connect by USB and accept the prompt. `adb devices` should list the phone (needs Android Studio / platform-tools).
3. In `FE/`: `npx expo run:android` (first build takes several minutes). It installs the app and starts Metro.
4. Later runs: `npx expo start --dev-client`, then open the Snapiano app on the phone.
5. No USB or Android Studio: `npx eas-cli build --profile development --platform android`, install the APK from the link, then `npx expo start --dev-client`.

**Troubleshooting**
- Stuck on a white screen: `npx expo start -c` (clears the cache).
- Phone can't see the dev server: check the firewall allows port 8081, or use `--tunnel`.
- After changing languages between RTL and LTR, reload the app fully (see root `CLAUDE.md`).
