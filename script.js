"use strict";

/**
 * Countdown + Settings app (single-file JS)
 * FIXED (iPhone 1-hour bug):
 * - We no longer save the date using toISOString() (UTC).
 * - Instead we save the target date as a NUMBER (milliseconds since epoch).
 *   That preserves the exact moment consistently across iPhone/Android/Desktop.
 *
 * Features:
 * - Countdown to a target date
 * - Change date (toggle input visibility)
 * - Change background image (from file picker) + auto-resize for smoother performance
 * - Settings drawer:
 *   - Change title + subtitle + extra line (saved)
 *   - Change confetti emoji list (saved)
 * - Uses localStorage so it persists after refresh / Add-to-Home-Screen
 */

/* =========================================================
   1) CONFIG (defaults)
========================================================= */

// ✅ Safer than parsing an ISO-like string in Safari: new Date(year, monthIndex, day, hour, min, sec)
// monthIndex is 0-based (May = 4)
let DEFAULT_TARGET_DATE = new Date(2026, 4, 5, 18, 0, 0);

const DEFAULT_TITLE = "💗 Counting down to the moment 💗";
const DEFAULT_SUBTITLE = "Every second closer… 🥰";
const DEFAULT_SUBTITLE2 = "yaaa";
const DEFAULT_EMOJIS = "💗 ❄️️ 🌼 ☔ ♥️ 💦 🥳 🥰";

const MAX_CONFETTI_COUNT = 40;
const BG_MAX_WIDTH = 1080;
const BG_JPEG_QUALITY = 0.85;

// ✅ Storage keys (kept in one place to avoid typos)
const LS = {
    title: "customTitle",
    subtitle: "customSubtitle",
    subtitle2: "customSubtitle2",
    emojis: "customEmojis",
    bg: "customBg",

    // ✅ NEW: save target as milliseconds (not ISO string)
    dateMs: "customDateMs",
};

/* =========================================================
   2) DOM ELEMENTS (get references once)
========================================================= */

console.log("script loaded ✅");

// Main text
const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const subtitle2El = document.getElementById("subtitle2");
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

// Settings inputs/buttons
const titleInput = document.getElementById("titleInput");
const subtitleInput = document.getElementById("subtitleInput");
const emojiInput = document.getElementById("emojiInput");
const saveText = document.getElementById("saveText");
const resetText = document.getElementById("resetText");

// Guard: log missing elements so you can quickly fix HTML ids
const required = {
    titleEl,
    subtitleEl,
    subtitle2El,
    subtitle2Input,
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

// 3.1 Load saved title/subtitle/subtitle2 (or defaults)
titleEl.textContent = localStorage.getItem(LS.title) || DEFAULT_TITLE;
subtitleEl.textContent = localStorage.getItem(LS.subtitle) || DEFAULT_SUBTITLE;
subtitle2El.textContent = localStorage.getItem(LS.subtitle2) || DEFAULT_SUBTITLE2;

// 3.2 Load saved emojis (or default), then build confetti immediately
emojiInput.value = localStorage.getItem(LS.emojis) || DEFAULT_EMOJIS;
applyConfettiEmojis(emojiInput.value);

// 3.3 ✅ Load saved target date (milliseconds) (or keep default)
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

// Keep settings inputs in sync with current UI text
titleInput.value = titleEl.textContent;
subtitleInput.value = subtitleEl.textContent;

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
saveText.addEventListener("click", () => {
    // Title
    const newTitle = titleInput.value.trim() || DEFAULT_TITLE;
    titleEl.textContent = newTitle;
    localStorage.setItem(LS.title, newTitle);

    // Subtitle
    const newSubtitle = subtitleInput.value.trim() || DEFAULT_SUBTITLE;
    subtitleEl.textContent = newSubtitle;
    localStorage.setItem(LS.subtitle, newSubtitle);

    // Extra line
    const newSubtitle2 = subtitle2Input.value.trim() || DEFAULT_SUBTITLE2;
    subtitle2El.textContent = newSubtitle2;
    localStorage.setItem(LS.subtitle2, newSubtitle2);

    // Emojis
    const emojis = emojiInput.value.trim() || DEFAULT_EMOJIS;
    localStorage.setItem(LS.emojis, emojis);
    applyConfettiEmojis(emojis);

    closeDrawer();
});

// Reset settings back to defaults (does NOT reset date/background)
resetText.addEventListener("click", () => {
    titleEl.textContent = DEFAULT_TITLE;
    titleInput.value = DEFAULT_TITLE;
    localStorage.removeItem(LS.title);

    subtitleEl.textContent = DEFAULT_SUBTITLE;
    subtitleInput.value = DEFAULT_SUBTITLE;
    localStorage.removeItem(LS.subtitle);

    subtitle2El.textContent = DEFAULT_SUBTITLE2;
    subtitle2Input.value = DEFAULT_SUBTITLE2;
    localStorage.removeItem(LS.subtitle2);

    emojiInput.value = DEFAULT_EMOJIS;
    localStorage.removeItem(LS.emojis);
    applyConfettiEmojis(DEFAULT_EMOJIS);
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
/**
 * Behavior:
 * - Clicking "Change date" toggles the date input line (show/hide).
 * - The date picker popup should open only when user taps the calendar icon on the input.
 */
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

    // datetime-local returns a local time string (no timezone)
    // new Date("YYYY-MM-DDTHH:mm") is treated as LOCAL time by browsers.
    const next = new Date(dateInput.value);
    if (Number.isNaN(next.getTime())) return;

    DEFAULT_TARGET_DATE = next;

    // ✅ FIX: store milliseconds (not ISO UTC)
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

// Always show 2 digits for hours/minutes/seconds
function pad2(n) {
    return String(n).padStart(2, "0");
}

// Update UI once per second
function renderCountdown() {
    const now = new Date();
    const diffMs = DEFAULT_TARGET_DATE - now;

    // Show target line (user-friendly string)
    el.targetLine.textContent = "Target: " + DEFAULT_TARGET_DATE.toLocaleString();

    // If countdown finished
    if (diffMs <= 0) {
        el.days.textContent = "0";
        el.hours.textContent = "00";
        el.minutes.textContent = "00";
        el.seconds.textContent = "00";
        return;
    }

    // Convert ms -> seconds
    const totalSeconds = Math.floor(diffMs / 1000);

    // Split into days/hours/minutes/seconds
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Render
    el.days.textContent = String(days);
    el.hours.textContent = pad2(hours);
    el.minutes.textContent = pad2(minutes);
    el.seconds.textContent = pad2(seconds);
}

/* =========================================================
   8) EMOJI CONFETTI (rebuild the floating emoji grid)
========================================================= */

/**
 * Takes a space-separated emoji string and rebuilds the confetti.
 * Example: "💗 🧗‍♀️ 🥾❄️ 🏕️ 💘"
 */
function applyConfettiEmojis(emojiString) {
    const container = document.querySelector(".hearts");
    if (!container) return;

    // Split by whitespace: "💗 🧗‍♀️" -> ["💗","🧗‍♀️"]
    const list = emojiString.split(/\s+/).filter(Boolean);

    // Fallback if user clears input
    const emojis = list.length ? list : ["💗"];

    // Rebuild confetti spans
    container.innerHTML = "";
    for (let i = 0; i < MAX_CONFETTI_COUNT; i++) {
        const span = document.createElement("span");
        span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        container.appendChild(span);
    }
}

/* =========================================================
   9) START (initial render + tick every second)
========================================================= */

renderCountdown();
setInterval(renderCountdown, 1000);
