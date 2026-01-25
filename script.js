"use strict";

/**
 * Countdown + Settings app (single-file JS)
 *
 * FIXED (iPhone 1-hour bug):
 * - We save the target date as a NUMBER (milliseconds since epoch), not ISO (UTC).
 *
 * FIXED (subtitle2 bug):
 * - "Since last opened" now uses #sinceLine ONLY (not subtitle2).
 * - subtitle2 stays purely user-customizable in Settings.
 *
 * FIXED (checkbox removal):
 * - Removed allowEmptyText logic completely.
 * - Empty text is ALWAYS allowed (saving "" is valid).
 */

/* =========================================================
   1) CONFIG (defaults)
========================================================= */

// Safer than parsing an ISO-like string in Safari: new Date(year, monthIndex, day, hour, min, sec)
// monthIndex is 0-based (May = 4)
let DEFAULT_TARGET_DATE = new Date(2026, 4, 5, 18, 0, 0);

const DEFAULT_TITLE = "💗 Counting down to the moment 💗";
const DEFAULT_SUBTITLE = "Every second closer… 🥰";
const DEFAULT_SUBTITLE2 = "yaaa";
const DEFAULT_EMOJIS = "💗 ❄️️ 🌼 ☔ ♥️ 💦 🥳 🥰";

const MAX_CONFETTI_COUNT = 40;
const BG_MAX_WIDTH = 1080;
const BG_JPEG_QUALITY = 0.85;

// Storage keys (kept in one place to avoid typos)
const LS = {
    title: "customTitle",
    subtitle: "customSubtitle",
    subtitle2: "customSubtitle2",
    emojis: "customEmojis",
    bg: "customBg",

    // Save target as milliseconds (not ISO string)
    dateMs: "customDateMs",

    // "Since last opened"
    lastOpenedMs: "lastOpenedMs",
};

/* =========================================================
   1.5) "SINCE LAST OPENED" DATA (read previous -> store now)
========================================================= */

// Read previous open time (0 if none)
const lastOpenedMs = Number(localStorage.getItem(LS.lastOpenedMs) || "0");

// Store current open time immediately for next visit
localStorage.setItem(LS.lastOpenedMs, String(Date.now()));

// Compute time away
let timeAwayMs = 0;
if (lastOpenedMs > 0) {
    timeAwayMs = Date.now() - lastOpenedMs;
}

/* =========================================================
   2) DOM ELEMENTS (get references once)
========================================================= */

console.log("script loaded ✅");

// Main text
const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const subtitle2El = document.getElementById("subtitle2");
const sinceLineEl = document.getElementById("sinceLine");

// Settings inputs (text)
const titleInput = document.getElementById("titleInput");
const subtitleInput = document.getElementById("subtitleInput");
const subtitle2Input = document.getElementById("subtitle2Input");

// Countdown numbers + target line
const el = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
    targetLine: document.getElementById("targetLine"),
};

// Date controls
const dateBtn = document.getElementById("dateBtn");
const dateInput = document.getElementById("dateInput");

// Background controls
const bgBtn = document.getElementById("bgBtn");
const bgInput = document.getElementById("bgInput");

// Settings drawer controls
const openSettings = document.getElementById("openSettings");
const closeSettings = document.getElementById("closeSettings");
const settingsDrawer = document.getElementById("settingsDrawer");
const settingsOverlay = document.getElementById("settingsOverlay");

// Settings buttons
const emojiInput = document.getElementById("emojiInput");
const saveText = document.getElementById("saveText");
const resetText = document.getElementById("resetText");

// Guard: log missing elements so you can quickly fix HTML ids
const required = {
    titleEl,
    subtitleEl,
    subtitle2El,
    sinceLineEl,

    ...el,

    dateBtn,
    dateInput,

    bgBtn,
    bgInput,

    openSettings,
    closeSettings,
    settingsDrawer,
    settingsOverlay,

    titleInput,
    subtitleInput,
    subtitle2Input,
    emojiInput,

    saveText,
    resetText,
};

for (const [name, node] of Object.entries(required)) {
    if (!node) console.error(`Missing element: ${name}. Check your HTML ids.`);
}

/* =========================================================
   3) LOAD SAVED SETTINGS (localStorage)
========================================================= */

// Helper: use default only if key is missing (keeps "" as valid)
function getSavedOrDefault(key, defaultValue) {
    const v = localStorage.getItem(key);
    return v === null ? defaultValue : v; // IMPORTANT: keeps "" (empty) as valid
}

// 3.1 Load saved title/subtitle/subtitle2 (or defaults)
titleEl.textContent = getSavedOrDefault(LS.title, DEFAULT_TITLE);
subtitleEl.textContent = getSavedOrDefault(LS.subtitle, DEFAULT_SUBTITLE);
subtitle2El.textContent = getSavedOrDefault(LS.subtitle2, DEFAULT_SUBTITLE2);

// 3.2 Load saved emojis (or default), then build confetti immediately
emojiInput.value = localStorage.getItem(LS.emojis) || DEFAULT_EMOJIS;
applyConfettiEmojis(emojiInput.value);

// 3.3 Load saved target date (milliseconds) (or keep default)
const savedDateMs = localStorage.getItem(LS.dateMs);
if (savedDateMs) {
    const ms = Number(savedDateMs);
    if (!Number.isNaN(ms)) {
        DEFAULT_TARGET_DATE = new Date(ms);
    }
}

// 3.4 Load saved background
const savedBackground = localStorage.getItem(LS.bg);
if (savedBackground) {
    setBackground(savedBackground);
}

/* =========================================================
   4) SETTINGS DRAWER (open/close + save/reset)
========================================================= */

function openDrawer() {
    settingsDrawer.classList.remove("hidden");
    settingsOverlay.classList.remove("hidden");
    settingsDrawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
    settingsDrawer.classList.add("hidden");
    settingsOverlay.classList.add("hidden");
    settingsDrawer.setAttribute("aria-hidden", "true");
}

// Open drawer: update inputs to match current UI before showing
openSettings.addEventListener("click", () => {
    titleInput.value = titleEl.textContent;
    subtitleInput.value = subtitleEl.textContent;
    subtitle2Input.value = subtitle2El.textContent;
    emojiInput.value = localStorage.getItem(LS.emojis) || DEFAULT_EMOJIS;
    openDrawer();
});

// Close drawer actions
closeSettings.addEventListener("click", closeDrawer);
settingsOverlay.addEventListener("click", closeDrawer);

// Save settings: title/subtitle/subtitle2/emojis
// ✅ Empty is ALWAYS allowed now.
saveText.addEventListener("click", () => {
    const newTitle = titleInput.value.trim();
    const newSubtitle = subtitleInput.value.trim();
    const newSubtitle2 = subtitle2Input.value.trim();

    titleEl.textContent = newTitle;
    subtitleEl.textContent = newSubtitle;
    subtitle2El.textContent = newSubtitle2;

    localStorage.setItem(LS.title, newTitle);
    localStorage.setItem(LS.subtitle, newSubtitle);
    localStorage.setItem(LS.subtitle2, newSubtitle2);

    // Emojis: keep your original behavior (if empty -> default)
    const emojis = emojiInput.value.trim() || DEFAULT_EMOJIS;
    localStorage.setItem(LS.emojis, emojis);
    applyConfettiEmojis(emojis);

    closeDrawer();
});

// Reset settings back to defaults (does NOT reset date/background)
resetText.addEventListener("click", () => {
    titleEl.textContent = DEFAULT_TITLE;
    localStorage.removeItem(LS.title);

    subtitleEl.textContent = DEFAULT_SUBTITLE;
    localStorage.removeItem(LS.subtitle);

    subtitle2El.textContent = DEFAULT_SUBTITLE2;
    localStorage.removeItem(LS.subtitle2);

    emojiInput.value = DEFAULT_EMOJIS;
    localStorage.removeItem(LS.emojis);
    applyConfettiEmojis(DEFAULT_EMOJIS);

    // Keep inputs aligned if drawer is open
    titleInput.value = titleEl.textContent;
    subtitleInput.value = subtitleEl.textContent;
    subtitle2Input.value = subtitle2El.textContent;
});

/* =========================================================
   5) BACKGROUND IMAGE LOGIC
========================================================= */

// Clicking the button triggers file picker
bgBtn.addEventListener("click", () => bgInput.click());

// When user selects an image -> resize -> set background -> save to localStorage
bgInput.addEventListener("change", () => {
    const file = bgInput.files && bgInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = () => {
        const img = new Image();

        img.onload = () => {
            const resizedDataUrl = resizeImageToDataUrl(img, BG_MAX_WIDTH, BG_JPEG_QUALITY);
            setBackground(resizedDataUrl);
            localStorage.setItem(LS.bg, resizedDataUrl);
        };

        img.src = reader.result;
    };

    reader.readAsDataURL(file);
});

// Apply background with a dark gradient overlay so text stays readable
function setBackground(dataUrl) {
    document.body.style.backgroundImage =
        `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${dataUrl})`;
}

// Resize image down to maxWidth and return a compressed JPEG dataURL
function resizeImageToDataUrl(img, maxWidth, jpegQuality) {
    let width = img.width;
    let height = img.height;

    // Only shrink if needed (never enlarge)
    if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", jpegQuality);
}

/* =========================================================
   6) CHANGE DATE LOGIC (input hidden until button click)
========================================================= */

dateBtn.addEventListener("click", () => {
    const isHidden = dateInput.classList.contains("date-hidden");

    if (isHidden) {
        // Show input and prefill it with current date (but DON'T force open picker)
        dateInput.classList.remove("date-hidden");
        dateInput.value = toDatetimeLocalValue(DEFAULT_TARGET_DATE);
    } else {
        // Hide input and close any open picker UI
        dateInput.classList.add("date-hidden");
        dateInput.blur();
    }
});

// When user selects a new date/time -> update -> save -> refresh countdown
dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;

    const next = new Date(dateInput.value);
    if (Number.isNaN(next.getTime())) return;

    DEFAULT_TARGET_DATE = next;

    // Store milliseconds (not ISO UTC)
    localStorage.setItem(LS.dateMs, String(DEFAULT_TARGET_DATE.getTime()));

    renderCountdown();
});

// Convert Date -> "YYYY-MM-DDTHH:mm" for input[type=datetime-local]
function toDatetimeLocalValue(date) {
    const yyyy = date.getFullYear();
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const hh = pad2(date.getHours());
    const min = pad2(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/* =========================================================
   7) COUNTDOWN LOGIC
========================================================= */

function pad2(n) {
    return String(n).padStart(2, "0");
}

function renderCountdown() {
    const now = new Date();
    const diffMs = DEFAULT_TARGET_DATE - now;

    // Show target line (user-friendly string)
    el.targetLine.textContent = "Target: " + DEFAULT_TARGET_DATE.toLocaleString();

    if (diffMs <= 0) {
        el.days.textContent = "0";
        el.hours.textContent = "00";
        el.minutes.textContent = "00";
        el.seconds.textContent = "00";
        return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    el.days.textContent = String(days);
    el.hours.textContent = pad2(hours);
    el.minutes.textContent = pad2(minutes);
    el.seconds.textContent = pad2(seconds);
}

/* =========================================================
   8) EMOJI CONFETTI
========================================================= */

function applyConfettiEmojis(emojiString) {
    const container = document.querySelector(".hearts");
    if (!container) return;

    const list = emojiString.split(/\s+/).filter(Boolean);
    const emojis = list.length ? list : ["💗"];

    container.innerHTML = "";
    for (let i = 0; i < MAX_CONFETTI_COUNT; i++) {
        const span = document.createElement("span");
        span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        container.appendChild(span);
    }
}

/* =========================================================
   9) "SINCE LAST OPENED" UI (uses #sinceLine only)
========================================================= */

function formatTimeAway(ms) {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) return `${seconds} seconds`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"}`;
}

function showSinceLastOpened() {
    // Always start clean
    sinceLineEl.textContent = "";
    sinceLineEl.style.opacity = "1";

    if (timeAwayMs <= 0) return;
    if (timeAwayMs < 5000) return; // ignore tiny refreshes

    const pretty = formatTimeAway(timeAwayMs);
    sinceLineEl.textContent = `While you were away, ${pretty} passed 💗`;

    // Fade out after 5s (CSS transition handles the smoothness)
    requestAnimationFrame(() => {
        setTimeout(() => {
            sinceLineEl.style.opacity = "0";
        }, 5000);
    });
}

/* =========================================================
   10) START
========================================================= */

renderCountdown();
showSinceLastOpened();
setInterval(renderCountdown, 1000);
