## Progressive web app examples

My collection of PWAs with fixes and modifications.

The Live Demos work in any broswer (mobile or desktop).
The apps can also be installed on a mobile device.
This gives the app an icon on the home screen and allows it to work in offline mode.

### Installation instructions for all apps

- View the Live Demo in your mobile browser
- Android (Chrome): open the menu (three dots), then *Add to Home screen*, and *Install*
  - A VPN may be required for some regions
- iOS (Safari): press the share button (box with up arrow), then *Add to Home Screen*
  - Keep *Open as Wep App* selected

## Temperature converter

A PWA that converts temperatures.

- [Live Demo](https://jedick.github.io/PWA/temperature-converter/)
- [App files](temperature-converter)
- Upstream source: [MicrosoftEdge/Demos](https://github.com/MicrosoftEdge/Demos) and [Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/samples/temperature-converter-source-files)

## CycleTracker

A basic app for tracking menstrual cycles.

- [Live Demo](https://jedick.github.io/PWA/cycletracker)
- [App files](cycletracker)
- Upstream source: [mdn/pwa-examples](https://github.com/mdn/pwa-examples/tree/main/cycletracker/service_workers)
- Local fixes
  - [Manifest](cycletracker/cycletracker.json)
    - Use *site subdirectory* (`./`) as starting URL for the app
    - Upstream's live demo used *site root* (`/`), giving a 404 for app installed from GitHub pages
  - [Service worker](cycletracker/sw.js)
    - Look for files in app directory (`./`) instead of site root (`/`)
    - Add manifest and app icon to cache to improve installability
  - See [this comment](https://github.com/mdn/pwa-examples/issues/39#issuecomment-4011916095) for details

### Usage

- This app uses local storage to record periods.
- On Android, local storage is shared between the browser and installed app. So, if you enter a period in CycleTracker in the browser, it will also show up in the installed app.
- On iOS, local storage for the browser and installed app are separate. Data entered in one won't appear in the other.

## CT2

An upgrade of CycleTracker to use Supabase for storage and authentication.
The [database schema](CT2/supabase.sql) was developed with the AI assistant in Supabase.
The application code was developed with Cursor.

- [Live Demo](https://jedick.github.io/PWA/CT2)
- [App files](CT2)

<details>
<summary>Details from Cursor</summary>

### What I implemented

- **Email auth UI** (in `index.html`):  
  - Added a small `#auth` section above the period form with:
    - `auth-form` (email + password fields, “Sign in / Sign up” button)  
    - `sign-out` button (hidden when signed out)  
    - `auth-status` message area.

- **Supabase config + client loading** (in `index.html`):  
  - Added a global config object you can edit with your real project details:
    ```js
    window.CT2_SUPABASE_CONFIG = {
      url: "https://YOUR-PROJECT-ref.supabase.co",
      anonKey: "YOUR-PUBLISHABLE-OR-ANON-KEY",
    };
    ```
  - Included Supabase JS v2 via CDN before `app.js`:
    ```html
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="app.js" defer></script>
    ```

- **Supabase initialization and auth handling** (in `app.js`):  
  - New globals and wiring:
    - Auth elements: `authFormEl`, `authEmailInputEl`, `authPasswordInputEl`, `signOutButtonEl`, `authStatusEl`.
    - Supabase state: `let supabaseClient = null; let currentUserId = null;`.
  - `initSupabase()`:
    - Reads `window.CT2_SUPABASE_CONFIG`, creates `supabaseClient`, fetches existing session, and subscribes to `auth.onAuthStateChange`.
  - `handleEmailAuth(email, password)`:
    - Tries `signInWithPassword`; on failure, falls back to `signUp`.
    - Updates `auth-status` messages accordingly.
    - Calls `onAuthSessionChanged(session)` when a session is available.
  - `onAuthSessionChanged(session)`:
    - On sign-out: clears `currentUserId`, hides sign-out button, shows “Signed out”.
    - On sign-in: sets `currentUserId`, shows sign-out, displays “Signed in as …”.
    - Ensures a corresponding row exists in `user_profiles` (`ensureUserProfile()`), then pulls remote cycles (`syncCyclesFromRemote()`).
  - `ensureUserProfile()`:
    - `upsert` into `user_profiles` with `{ id: currentUserId }` so `cycles.user_id` can reference it (matching your schema + RLS).
  - `syncCyclesFromRemote()`:
    - Selects `start_date, end_date` from `cycles` (RLS restricts to the authenticated user).
    - Maps them to the local format `{ startDate, endDate }`, stores in `localStorage`, and calls `renderPastPeriods()`.

- **Period storage integration with Supabase** (in `app.js`):  
  - Existing `storeNewPeriod` behavior is preserved (localStorage is still the primary store and works fully offline).
  - Added `savePeriodRemote(startDate, endDate)`:
    - If `supabaseClient` and `currentUserId` are available, inserts into `cycles` with `user_id = currentUserId`, `start_date`, `end_date`.
    - Called from `storeNewPeriod` as a best-effort async write; failures don’t affect local behavior.

- **Event wiring** (in `app.js`):  
  - `authFormEl` submit → `handleEmailAuth(email, password)` (if Supabase is available; otherwise it informs the user that only local storage is available).  
  - `signOutButtonEl` click → `supabaseClient.auth.signOut()`.  
  - `newPeriodFormEl` submit remains essentially the same, but now also triggers `savePeriodRemote`.

### How it aligns with your `supabase.sql`

- Uses `user_profiles(id uuid PRIMARY KEY DEFAULT auth.uid())` by:
  - Creating a row with `id = auth.uid()` (via `ensureUserProfile()`), satisfying the FK from `cycles.user_id`.
- Uses `cycles(user_id, start_date, end_date, ...)` by:
  - Inserting `user_id = currentUserId` (which is `auth.uid()` from the Supabase session).
  - Fetching only `start_date` and `end_date` per the RLS policies you defined; each authenticated user only sees their own cycles.

### How to configure and test

1. **Fill in your Supabase details** in `CT2/index.html`:
   - Replace `YOUR-PROJECT-ref` with your project ref (e.g., `abc123.supabase.co`).
   - Replace `YOUR-PUBLISHABLE-OR-ANON-KEY` with your publishable/anon key from Supabase.
2. **Apply the SQL** in `CT2/supabase.sql` to your Supabase project (e.g., via the SQL editor or migrations) so `user_profiles` and `cycles` plus RLS are in place.
3. **Run the CT2 PWA** (as you already do), then:
   - Enter an email/password in the new auth form and submit.
   - A first attempt will sign in if the account exists, or sign up otherwise.
   - Add new cycles; they will be stored locally and, if signed in, also persisted into the `cycles` table tied to your authenticated user.

This keeps the CT2 app small and mostly unchanged while adding email-based auth and database-backed storage that respects your Supabase schema and RLS policies.

</details>


