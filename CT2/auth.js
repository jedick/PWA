// Auth module for CT2 (Supabase + UI). Import from app.js.

const STORAGE_KEY = "period-tracker"; // must match app.js

const authSignInWrapperEl = document.getElementById("auth-sign-in-wrapper");
const authFormEl = document.getElementById("auth-form");
const authEmailInputEl = document.getElementById("auth-email");
const authPasswordInputEl = document.getElementById("auth-password");
const signOutButtonEl = document.getElementById("sign-out");
const authStatusEl = document.getElementById("auth-status");

let supabaseClient = null;
let currentUserId = null;

function setAuthStatus(message) {
  if (!authStatusEl) return;
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
      await supabaseClient.auth.signUp({ email, password });

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
    if (authSignInWrapperEl) authSignInWrapperEl.hidden = false;
    if (signOutButtonEl) signOutButtonEl.hidden = true;
    setAuthStatus("Signed out.");
    return;
  }

  currentUserId = session.user.id;
  if (authSignInWrapperEl) authSignInWrapperEl.hidden = true;
  if (signOutButtonEl) signOutButtonEl.hidden = false;
  setAuthStatus(`Signed in as ${session.user.email || "your account"}.`);

  await ensureUserProfile();
  await syncCyclesFromRemote();
}

async function ensureUserProfile() {
  if (!supabaseClient || !currentUserId) return;
  await supabaseClient
    .from("user_profiles")
    .upsert({ id: currentUserId }, { onConflict: "id" });
}

async function syncCyclesFromRemote() {
  if (!supabaseClient || !currentUserId) return;

  const { data, error } = await supabaseClient
    .from("cycles")
    .select("start_date, end_date")
    .order("start_date", { ascending: false });

  if (error || !data) return;

  const periods = data.map((row) => ({
    startDate: row.start_date,
    endDate: row.end_date || row.start_date,
  }));

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
  // Refresh periods list; app.js registers window.CT2RenderPastPeriods
  window.CT2RenderPastPeriods?.();
}

export function savePeriodRemote(startDate, endDate) {
  if (!supabaseClient || !currentUserId) return;
  supabaseClient.from("cycles").insert({
    user_id: currentUserId,
    start_date: startDate,
    end_date: endDate,
  });
}

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
    if (!email || !password) return;
    await handleEmailAuth(email, password);
  });
}

if (signOutButtonEl) {
  signOutButtonEl.addEventListener("click", async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  });
}

export function initSupabase() {
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
