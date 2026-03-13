// JS file for cycleTracker app

// -------------
// Variable declarations
// -------------
const authFormEl = document.getElementById("auth-form");
const authEmailInputEl = document.getElementById("auth-email");
const authPasswordInputEl = document.getElementById("auth-password");
const signOutButtonEl = document.getElementById("sign-out");
const authStatusEl = document.getElementById("auth-status");

const newPeriodFormEl = document.getElementById("new-period");
const startDateInputEl = document.getElementById("start-date");
const endDateInputEl = document.getElementById("end-date");
const pastPeriodContainer = document.getElementById("past-periods");

// Storage key is an app-wide constant
const STORAGE_KEY = "period-tracker";

// Supabase client state
let supabaseClient = null;
let currentUserId = null;

// -------------
// Event Handlers
// -------------
if (authFormEl) {
  authFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      setAuthStatus(
        "Online sign-in is unavailable. Periods will be stored only on this device.",
      );
      return;
    }
    const email = authEmailInputEl.value.trim();
    const password = authPasswordInputEl.value;
    if (!email || !password) {
      return;
    }
    await handleEmailAuth(email, password);
  });
}

if (signOutButtonEl) {
  signOutButtonEl.addEventListener("click", async () => {
    if (!supabaseClient) {
      return;
    }
    await supabaseClient.auth.signOut();
  });
}

if (newPeriodFormEl) {
  newPeriodFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const startDate = startDateInputEl.value;
    const endDate = endDateInputEl.value;
    if (checkDatesInvalid(startDate, endDate)) {
      return;
    }
    storeNewPeriod(startDate, endDate);
    renderPastPeriods();
    newPeriodFormEl.reset();
  });
}

// -------------
// Functionality
// -------------

// 0. Auth helpers
function setAuthStatus(message) {
  if (!authStatusEl) {
    return;
  }
  authStatusEl.textContent = message;
}

async function handleEmailAuth(email, password) {
  setAuthStatus("Signing in...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const { data: signUpData, error: signUpError } =
      await supabaseClient.auth.signUp({
        email,
        password,
      });

    if (signUpError) {
      setAuthStatus(signUpError.message || "Authentication failed.");
      return;
    }

    setAuthStatus(
      "Sign-up successful. You may need to confirm your email before signing in.",
    );
    if (signUpData.session) {
      await onAuthSessionChanged(signUpData.session);
    }
    return;
  }

  if (data && data.session) {
    await onAuthSessionChanged(data.session);
    setAuthStatus("Signed in.");
  } else {
    setAuthStatus("Signed in, but no active session was returned.");
  }
}

async function onAuthSessionChanged(session) {
  if (!session) {
    currentUserId = null;
    if (signOutButtonEl) {
      signOutButtonEl.hidden = true;
    }
    setAuthStatus("Signed out.");
    return;
  }

  currentUserId = session.user.id;
  if (signOutButtonEl) {
    signOutButtonEl.hidden = false;
  }
  setAuthStatus(`Signed in as ${session.user.email || "your account"}.`);

  await ensureUserProfile();
  await syncCyclesFromRemote();
}

async function ensureUserProfile() {
  if (!supabaseClient || !currentUserId) {
    return;
  }
  await supabaseClient
    .from("user_profiles")
    .upsert({ id: currentUserId }, { onConflict: "id" });
}

async function syncCyclesFromRemote() {
  if (!supabaseClient || !currentUserId) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("cycles")
    .select("start_date, end_date")
    .order("start_date", { ascending: false });

  if (error || !data) {
    return;
  }

  const periods = data.map((row) => ({
    startDate: row.start_date,
    endDate: row.end_date || row.start_date,
  }));

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
  renderPastPeriods();
}

async function savePeriodRemote(startDate, endDate) {
  if (!supabaseClient || !currentUserId) {
    return;
  }

  await supabaseClient.from("cycles").insert({
    user_id: currentUserId,
    start_date: startDate,
    end_date: endDate,
  });
}

// 1. Form validation
function checkDatesInvalid(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    newPeriodFormEl.reset();
    return true;
  }
  return false;
}

// 2. Get, add, sort, and store data
function storeNewPeriod(startDate, endDate) {
  const periods = getAllStoredPeriods();
  periods.push({ startDate, endDate });
  periods.sort((a, b) => {
    return new Date(b.startDate) - new Date(a.startDate);
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
  // Also save to Supabase for signed-in users. This call is best-effort and
  // does not affect local storage behavior if it fails.
  savePeriodRemote(startDate, endDate);
}

// 3. Get and parse data
function getAllStoredPeriods() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  const periods = data ? JSON.parse(data) : [];
  return periods;
}

// 4. Display data
function renderPastPeriods() {
  const pastPeriodHeader = document.createElement("h2");
  const pastPeriodList = document.createElement("ul");
  const periods = getAllStoredPeriods();
  if (periods.length === 0) {
    return;
  }
  pastPeriodContainer.innerHTML = "";
  pastPeriodHeader.textContent = "Past periods";
  periods.forEach((period) => {
    const periodEl = document.createElement("li");
    periodEl.textContent = `From ${formatDate(
      period.startDate,
    )} to ${formatDate(period.endDate)}`;
    pastPeriodList.appendChild(periodEl);
  });

  pastPeriodContainer.appendChild(pastPeriodHeader);
  pastPeriodContainer.appendChild(pastPeriodList);
}

// 5. format dates for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

// -------------
// Call render on page load
// -------------

function initSupabase() {
  const config = window.CT2_SUPABASE_CONFIG;
  if (
    !config ||
    !config.url ||
    !config.anonKey ||
    typeof supabase === "undefined"
  ) {
    return;
  }
  supabaseClient = supabase.createClient(config.url, config.anonKey);

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data && data.session) {
      onAuthSessionChanged(data.session);
    }
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    onAuthSessionChanged(session);
  });
}

initSupabase();
renderPastPeriods();
