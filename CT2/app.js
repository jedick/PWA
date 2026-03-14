// JS file for cycleTracker app

import { initSupabase, savePeriodRemote } from "./auth.js";

// -------------
// Variable declarations
// -------------
const newPeriodFormEl = document.getElementById("new-period");
const startDateInputEl = document.getElementById("start-date");
const endDateInputEl = document.getElementById("end-date");
const pastPeriodContainer = document.getElementById("past-periods");

const STORAGE_KEY = "period-tracker";

// -------------
// Event Handlers
// -------------
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

// 5. Format dates for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

// -------------
// Init: initSupabase first, then renderPastPeriods (order of execution)
// -------------
// Global hook for "refresh past periods list" (auth.js calls after sync). Do not remove.
window.CT2RenderPastPeriods = renderPastPeriods;
initSupabase();
renderPastPeriods();
