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

1. On first launch, choose a permit zone and add your first class or finish setup and add it later. Manage your permit and classes under Schedule. Changes persist on this device.
2. Open Parking to see the next scheduled class and a suggested parking spot. Start navigation to see an aisle route ending at that spot.
3. Select **I’ve parked** to confirm parking, then **Done** to return to the Parking screen.

For the project walkthrough, enter COSC 3360 Human Computer Interaction, Tuesday and Thursday, 15:30–16:45, Center for Instruction, CI 122, and select Zone A.

## Data and scope

CampusPark covers 35 destinations, 19 parking areas, and four permit zones. Bayside Parking Garage recommendations account for each floor. Select a permit and class destination under Schedule.

| Reference | What it informs |
| --- | --- |
| [TAMU-CC Parking Services](https://www.tamucc.edu/finance-and-administration/auxiliary-services/parking-services/index) and [permit purchase guide](https://www.tamucc.edu/finance-and-administration/auxiliary-services/parking-services/purchase-permit.php) | Permit eligibility for parking areas in the app, including top-floor-only access for Zone B at Bayside. CampusPark offers Hammerhead for Zone D. |
| [TAMU-CC campus map](https://www.tamucc.edu/about-us/assets/documents/tamucc-campus-map.pdf), [earlier event map](https://www.tamucc.edu/family-weekend/assets/documents/familyweekend-parking.pdf), and [facilities signage guide](https://www.tamucc.edu/finance-and-administration/facility-administration/facilities/signage.php) | Campus destinations, walking corridors, and approach-road labels. Tarpon is on the current permit list and its model position uses the earlier map's Wavecrest Drive placement. Confirm the current location on site. |
| [Performing Arts Center directions](https://www.tamucc.edu/performing-arts-center/venue-information/parking-and-directions.php), [City Bay Trail and walking trails](https://www.corpuschristitx.gov/department-directory/parks-and-recreation/parks-and-facilities/hike-and-bike-trails/), and [Alumni Welcome Center](https://www.tamucc.edu/institutional-advancement/external-relations/event-services/planning-tools.php) | Ocean Drive connects the Island Boulevard and Sand Dollar Boulevard entrances. The Alumni Welcome Center is on Ennis Joslin Road. The trail system supplies area context. |
| [Registrar 2026–27 academic calendar](https://www.tamucc.edu/academics/registrar/assets/documents/academic-calendar-26-27.pdf) | Availability estimates vary across regular weekdays, finals, breaks, and weekends. Saved classes recur weekly. |

Ocean Drive is the approach from downtown and connects to Ennis Joslin Road near Oso Bay. The mainland approach to Momentum uses Islander Way and Nile Drive. The nearby Hans & Pat Suter Wildlife Refuge and Bay Trail are area landmarks. Parking at those sites and at apartment complexes is outside the campus permit inventory. [City trail directory](https://www.corpuschristitx.gov/department-directory/parks-and-recreation/parks-and-facilities/hike-and-bike-trails/)

**How estimates work.** CampusPark models arrival 40 minutes before class or at the current time if that window has started. The availability model uses a date- and stall-specific seed plus time-of-day and lot-type demand. Walking estimates follow approximate campus corridors and include time to exit the aisle or garage level. Recommendations use parking areas near the destination on the same campus.

**Parking rules.** The university FAQ reports roughly 6,000 main-campus spaces. The garage project materials-testing contractor reports four levels and 1,205 vehicles at completion. CampusPark covers standard permit parking. The campus uses distinct rules for visitor, accessible, and reserved spaces. Parking Services and event organizers handle visitor payment and special-event permissions. [Parking FAQ](https://www.tamucc.edu/finance-and-administration/auxiliary-services/parking-services/frequently-asked-questions.php) · [Bayside garage project](https://www.ariasinc.com/projects/texas-a-m-university-corpus-christi-bayside-parking-garage) · [Visitor parking](https://www.tamucc.edu/finance-and-administration/auxiliary-services/parking-services/visitor-parking.php)

The route preview advances on a timer. Follow posted signs on campus. The app uses local time for the class schedule, and recommendations carry no reservation.

The app stores class schedules, permit zone, and appearance preferences in local storage. It requires no account or location permission and sends no user data to a server.

## Accessibility and evaluation

The app uses labeled HTML controls, scalable text, visible keyboard focus, and primary buttons at least 48 CSS pixels tall. The map has a text description and route instructions. Test TalkBack, large system fonts, keyboard focus, and small screens with actual participants before claiming accessibility compliance.

Run `npm test` to check weekly schedule rollover, permit eligibility, time-varying demand, destination ranking, and same-campus recommendations. Participant usability testing remains to be completed by the team.
