## Progressive web app examples

My collection of PWAs with fixes and modifications.

The Live Demos work in any broswer (mobile or desktop).
The apps can also be installed on a mobile device.
This gives the app an icon on the home screen and allows it to work in offline mode.

#### Installation

- View the Live Demo in your mobile browser
- Android (Chrome): open the menu (three dots), then *Add to Home screen*, and *Install*
  - A VPN may be required for some regions
- iOS (Safari): press the share button (box with up arrow), then *Add to Home Screen*
  - Keep *Open as Wep App* selected

### CycleTracker

A basic app for tracking menstrual cycles.

- [Live Demo](https://jedick.github.io/PWA/cycletracker)
- [App files](cycletracker)
- Upstream source: [mdn/pwa-examples](https://github.com/mdn/pwa-examples/tree/main/cycletracker/service_workers)
- Local fixes
  - [Manifest](cycletracker/cycletracker.json):
    - Use *site subdirectory* as starting URL for the app
    - Upstream's live demo used *site root*, giving a 404 for app installed from GitHub pages
  - [Service worker](cycletracker/sw.js):
    - Look for files in app directory instead of site root
    - Add manifest and app icon to cache to improve installability
  - See [this comment](https://github.com/mdn/pwa-examples/issues/39#issuecomment-4011916095) for details

#### Usage

- This app uses local storage to record periods.
- On Android, local storage is shared between the browser and installed app. So, if you enter a period in CycleTracker in the browser, it will also show up in the installed app.
- On iOS, local storage for the browser and installed app are separate. Data entered in one won't appear in the other.

