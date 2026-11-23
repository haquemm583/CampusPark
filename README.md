# CampusPark

CampusPark is the Pixel People HCI semester project. The current app uses React, JavaScript, and CSS, with Capacitor for Android.

## Run

```sh
npm ci
npm run dev
```

Open the address Vite prints to test in your browser. Edit `src/main.jsx` for screens, `src/styles.css` for styling, and `src/parking.js` for parking and schedule rules.

For Android, run `npm run android:sync` after `npm ci` on a fresh checkout and after changing the web code. Open the **android** folder in Android Studio, then select a phone or emulator and press Run. Use Android SDK 35 and JDK 21 or a compatible newer JDK. To build from PowerShell, enter `android` and run `.\gradlew.bat assembleDebug`. The APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Core tasks

1. Open Schedule, select a permit zone, and add classes with meeting days, times, building, and room. Changes persist locally.
2. Open Parking to see the next scheduled class and an eligible recommended space. Start navigation to see an aisle route ending at that stall.
3. Report a space occupied to receive another eligible suggestion. Repeat until no eligible spaces remain, or confirm parking and return to the Parking screen.

For the project walkthrough, enter COSC 3360 Human Computer Interaction, Tuesday and Thursday, 15:30–16:45, Center for Instruction, CI 122, and select Zone A. Use **Clear occupied reports** in About to repeat the parking flow.

## Data and scope

Campus building names and parking eligibility reference [TAMU-CC Parking Services](https://www.tamucc.edu/finance-and-administration/auxiliary-services/parking-services/index) and the [campus map](https://www.tamucc.edu/about-us/assets/documents/tamucc-campus-map.pdf). This version includes four destination buildings and four lots.

Stalls, occupancy, walking estimates, and aisle diagrams are simulated. The marker and turn instructions advance on a timer without GPS, geographic routing, or live sensor data. Availability reports are stored on the device. A recommendation does not reserve a space. Follow campus signage.

The app stores class schedules, permit zone, occupied reports, and appearance preferences in local storage. It requires no account or location permission and sends no user data to a server.

## Accessibility and evaluation

The app uses labeled HTML controls, scalable text, visible keyboard focus, and primary buttons at least 48 CSS pixels tall. The map has a text description and route instructions. Test TalkBack, large system fonts, keyboard focus, and small screens with actual participants before claiming accessibility compliance.

Run `npm test` to check weekly schedule rollover, permit filtering, occupied-space exclusion, and exhausted availability. Participant usability testing remains to be completed by the team.
