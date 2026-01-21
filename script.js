"use strict";

/**
 * Countdown + Settings app (single-file JS)
 * Features:
 * - Countdown to a target date
 * - Change date (toggle input visibility)
 * - Change background image (from file picker) + auto-resize for smoother performance
 * - Settings drawer:
 *   - Change title + subtitle (saved)
 *   - Change confetti emoji list (saved)
 * - Uses localStorage so it persists after refresh / Add-to-Home-Screen
 */
/* =========================================================
   1) CONFIG (defaults)
========================================================= */
let DEFAULT_TARGET_DATE = new Date("2026-05-05T18:00:00");
const DEFAULT_TITLE = "💗 Counting down to the moment 💗";
const DEFAULT_SUBTITLE = "Every second closer… 🥰";
const DEFAULT_SUBTITLE2 = "yaaa";
const DEFAULT_EMOJIS = "💗 ❄️️ 🌼 ☔ ♥️ 💦 🥳 🥰";
const MAX_CONFETTI_COUNT = 40;
const BG_MAX_WIDTH = 1080;
const BG_JPEG_QUALITY = 0.85;

/* =========================================================
   2) DOM ELEMENTS (get references once)
========================================================= */

console.log("script loaded ✅");

//TODO : change names of titles to be readable in html and script
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

// Date controls (button toggles input visibility)
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

// 3.1 Load saved title/subtitle (or defaults)
titleEl.textContent =
    localStorage.getItem("customTitle") || DEFAULT_TITLE;
subtitleEl.textContent =
    localStorage.getItem("customSubtitle") || DEFAULT_SUBTITLE;
subtitle2El.textContent =
    localStorage.getItem("customSubtitle2") || DEFAULT_SUBTITLE2;

// 3.2 Load saved emojis (or default), then build confetti
emojiInput.value =
    localStorage.getItem("customEmojis") || DEFAULT_EMOJIS;
applyConfettiEmojis(emojiInput.value);

// 3.3 Load saved target date (or keep default DEFAULT_TARGET_DATE)
const savedDate = localStorage.getItem("customDate");
if (savedDate) {
    DEFAULT_TARGET_DATE = new Date(savedDate);
}

// 3.4 Load saved background
const savedBackground = localStorage.getItem("customBg");
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
    emojiInput.value = localStorage.getItem("customEmojis") || DEFAULT_EMOJIS;
    subtitle2Input.value = subtitle2El.textContent;
    openDrawer();
});

// Close drawer actions
closeSettings.addEventListener("click", closeDrawer);
settingsOverlay.addEventListener("click", closeDrawer);

// Save settings: title/subtitle/emojis
saveText.addEventListener("click", () => {
    // Title & subtitle & subtitle2: fallback to defaults if user clears the input
    const newTitle = titleInput.value.trim() || DEFAULT_TITLE;
    titleEl.textContent = newTitle;
    localStorage.setItem("customTitle", newTitle);
    const newSubtitle = subtitleInput.value.trim() || DEFAULT_SUBTITLE;
    subtitleEl.textContent = newSubtitle;
    localStorage.setItem("customSubtitle", newSubtitle);
    const newSubtitle2 = subtitle2Input.value.trim() || DEFAULT_SUBTITLE2;
    subtitle2El.textContent = newSubtitle2;
    localStorage.setItem("customSubtitle2", newSubtitle2);
    // Emojis: fallback to defaults if empty
    const emojis = emojiInput.value.trim() || DEFAULT_EMOJIS;
    localStorage.setItem("customEmojis", emojis);
    applyConfettiEmojis(emojis);

    closeDrawer();
});

// Reset settings back to defaults (does NOT reset date/background)
resetText.addEventListener("click", () => {
    titleEl.textContent = DEFAULT_TITLE;
    titleInput.value = DEFAULT_TITLE;
    localStorage.removeItem("customTitle");

    subtitleEl.textContent = DEFAULT_SUBTITLE;
    subtitleInput.value = DEFAULT_SUBTITLE;
    localStorage.removeItem("customSubtitle");

    subtitle2El.textContent = DEFAULT_SUBTITLE2;
    subtitle2Input.value = DEFAULT_SUBTITLE2;
    localStorage.removeItem("customSubtitle2");

    emojiInput.value = DEFAULT_EMOJIS;
    localStorage.removeItem("customEmojis");
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
            localStorage.setItem("customBg", resizedDataUrl);
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
        // Show input and prefill it with current DEFAULT_TARGET_DATE (but DON'T open picker)
        dateInput.classList.remove("date-hidden");
        dateInput.value = toDatetimeLocalValue(DEFAULT_TARGET_DATE);
    } else {
        // Hide input and close any open picker UI
        dateInput.classList.add("date-hidden");
        dateInput.blur();
    }
});

// When user selects a new date/time -> update DEFAULT_TARGET_DATE -> save -> refresh countdown
dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;

    // datetime-local returns a local time string (no timezone),
    // so new Date(...) will interpret it in the viewer's local timezone.
    DEFAULT_TARGET_DATE = new Date(dateInput.value);

    localStorage.setItem("customDate", DEFAULT_TARGET_DATE.toISOString());
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
