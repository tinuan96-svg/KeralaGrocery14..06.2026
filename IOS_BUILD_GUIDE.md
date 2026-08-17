# Kerala Groceries – iOS App Store Build Guide

This guide takes you from a freshly cloned repo to a TestFlight build ready for App Store review.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| macOS | 14 Sonoma+ | — |
| Xcode | 15+ | App Store |
| Node.js | 18+ | nodejs.org |
| CocoaPods | 1.14+ | `sudo gem install cocoapods` |
| sharp | latest | `npm install -D sharp plist` |

---

## Part 1 — One-time project setup (Mac required)

### 1.1  Install dependencies

```bash
npm install
```

### 1.2  Generate app icons and splash screens

```bash
npm run cap:icons     # writes to ios-assets/AppIcon.appiconset/
npm run cap:splash    # writes to ios-assets/LaunchImage.launchimage/
```

### 1.3  Add the iOS Capacitor project

```bash
npm run ios:setup
```

This single command:
1. Runs `npx cap add ios` — scaffolds the `ios/` Xcode project
2. Patches `ios/App/App/Info.plist` with all required keys
3. Copies the correct `Podfile`
4. Runs `pod install`

### 1.4  Copy generated icons into the Xcode asset catalogue

```bash
cp ios-assets/AppIcon.appiconset/*.png \
   ios/App/App/Assets.xcassets/AppIcon.appiconset/

cp ios-assets/LaunchImage.launchimage/*.png \
   ios/App/App/Assets.xcassets/Splash.imageset/ 2>/dev/null || true
```

---

## Part 2 — Xcode configuration

### 2.1  Open the project

```bash
npm run cap:ios
# or manually: open ios/App/App.xcworkspace   (use .xcworkspace, not .xcodeproj)
```

### 2.2  Signing & Capabilities

1. Select the **App** target → **Signing & Capabilities**
2. Set **Team** to your Apple Developer team
3. Set **Bundle Identifier** to `com.keralagrocery.app`
4. Enable **Automatically manage signing**
5. Click **+ Capability** and add:
   - **Push Notifications**
   - **Associated Domains** → add `applinks:keralagrocery.com`

### 2.3  Replace TEAMID in apple-app-site-association

1. Open `public/.well-known/apple-app-site-association`
2. Replace every occurrence of `TEAMID` with your 10-character Apple Team ID
   (found at developer.apple.com → Membership)
3. Deploy the updated file to production so Apple can verify it

### 2.4  Google Sign-In reverse client ID

1. Go to console.cloud.google.com → your project → Credentials
2. Find the iOS OAuth 2.0 client ID; it looks like `1234567890-abc.apps.googleusercontent.com`
3. Open `ios-config/Info.plist.patch`, replace `GOOGLE_CLIENT_ID` with the numeric part
4. Run `npm run cap:patch-plist` to re-apply

---

## Part 3 — Build for TestFlight

### 3.1  Sync web assets to iOS

After any web code change, run:

```bash
npm run cap:sync
```

This copies `public/` and runs `npx cap sync` which updates the native plugins.

### 3.2  Set version numbers

In Xcode → **App** target → **General**:
- **Version**: e.g. `1.0.0`
- **Build**: increment this for every TestFlight upload

Or from the terminal:

```bash
agvtool new-marketing-version 1.0.0
agvtool new-version -all 1
```

### 3.3  Archive for distribution

1. In Xcode, select **Any iOS Device (arm64)** as the destination
2. **Product → Archive**
3. In the Organizer, click **Distribute App**
4. Choose **App Store Connect** → **Upload**
5. Follow the wizard; select "Automatically manage signing"

---

## Part 4 — App Store Connect setup

### 4.1  Create the app record

1. appstoreconnect.apple.com → **My Apps** → **+**
2. Platform: iOS
3. Bundle ID: `com.keralagrocery.app`
4. SKU: `kerala-groceries-ios`
5. Primary language: English (UK)

### 4.2  App information

| Field | Value |
|-------|-------|
| Name | Kerala Groceries |
| Subtitle | Authentic Kerala. Delivered to UK. |
| Category | Food & Drink |
| Secondary category | Shopping |

### 4.3  App Privacy (Data Safety)

Mark the following as **Collected and used**:

| Data type | Purpose |
|-----------|---------|
| Name | Account management |
| Email address | Account management, app functionality |
| Phone number | Account management, app functionality |
| Precise location | NOT collected |
| Coarse location | NOT collected (address entered by user) |
| Payment info | Financial info — processed by Worldpay |
| Purchase history | App functionality |
| User ID | Developer's advertising, analytics |
| Device ID | Analytics |
| Crash data | App functionality |

### 4.4  Age rating

Use the questionnaire; the app is suitable for **4+**.

### 4.5  Keywords (max 100 characters)

```
Kerala groceries,Indian grocery UK,spices delivery,Kerala food,South Indian
```

---

## Part 5 — App Store review notes

Add these notes in the **Review Information** section to avoid rejection under guideline 4.2 (minimum functionality):

> Kerala Groceries is a dedicated iOS shopping app for our e-commerce platform.
> It provides native features including:
> - APNS push notifications for order status updates
> - Native Share Sheet for sharing products
> - Haptic feedback on all interactive elements
> - Pull-to-refresh gesture on product listings
> - Native offline detection with graceful degradation
> - Universal Links for deep-linking to products and orders
> - Native status bar and splash screen integration via Capacitor
>
> The app uses WKWebView with full Capacitor native bridge to ensure all
> native capabilities are available throughout the app experience.
>
> Test account:
> Email: [create a test account before submitting]
> Password: [your test password]

---

## Part 6 — Ongoing release workflow

```bash
# 1. Make web changes and build
npm run build

# 2. Sync to iOS
npm run cap:sync

# 3. Open Xcode, increment Build number, Archive, Upload
npm run cap:ios
```

---

## Troubleshooting

### `pod install` fails with "No such module 'Capacitor'"

```bash
cd ios/App
pod deintegrate
pod install
```

### Google Sign-In opens Safari instead of in-app

Ensure the reversed client ID URL scheme is in Info.plist under `CFBundleURLTypes`.
The Supabase `redirectTo` URL should be `kgapp://auth/callback`.

### Push notifications not received in TestFlight

1. Verify the APN certificate/key is uploaded to Supabase Dashboard → Settings → Push Notifications
2. Call `requestPermission()` early in the app lifecycle (the CapacitorProvider does this automatically)

### Universal Links not working

1. Verify `apple-app-site-association` is served from `https://keralagrocery.com/.well-known/apple-app-site-association`
2. Content-Type must be `application/json`
3. The file must NOT redirect — Apple's CDN follows only one redirect
4. Verify the Team ID is correct (10-char alphanumeric)
5. After changing the file, wait up to 24 h for Apple's CDN to re-crawl it

### App rejected under guideline 4.2

Add more native functionality:
- Add barcode/QR scanner for product lookup

---

## File reference

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Main Capacitor configuration |
| `ios-config/Info.plist.patch` | iOS plist keys to merge |
| `ios-config/Podfile.patch` | CocoaPods dependencies |
| `ios-assets/AppIcon.appiconset/` | Generated app icons |
| `ios-assets/LaunchImage.launchimage/` | Generated splash screens |
| `scripts/generate-ios-icons.js` | Icon generation script |
| `scripts/generate-splash-screens.js` | Splash generation script |
| `scripts/patch-info-plist.js` | Plist merge script |
| `public/.well-known/apple-app-site-association` | Universal Links config |
| `hooks/useNative.ts` | Native hooks (haptics, network, push, share) |
| `components/native/CapacitorProvider.tsx` | App-level native initialiser |
| `components/native/PullToRefresh.tsx` | Pull-to-refresh component |
| `components/native/NativeShareButton.tsx` | Share sheet button |
