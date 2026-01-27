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

LS.mEnabled = "milestoneEnabled";
LS.mDateMs = "milestoneDateMs";
LS.mMsg = "milestoneMsg";


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

// Milestone UI (HOME screen)
const milestoneCard = document.getElementById("milestoneCard");
const milestoneText = document.getElementById("milestoneText");
const mDays = document.getElementById("mDays");
const mHours = document.getElementById("mHours");
const mMinutes = document.getElementById("mMinutes");
const mSeconds = document.getElementById("mSeconds");

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

// Milestone settings inputs (DRAWER)
const milestoneEnabled = document.getElementById("milestoneEnabled");
const milestoneDate = document.getElementById("milestoneDate");
const milestoneMsg = document.getElementById("milestoneMsg");

// Guard: log missing elements so you can quickly fix HTML ids
const required = {
    // Main text
    titleEl,
    subtitleEl,
    subtitle2El,
    sinceLineEl,

    // Countdown
    ...el,

    // Milestone display
    milestoneCard,
    milestoneText,
    mDays,
    mHours,
    mMinutes,
    mSeconds,

    // Date
    dateBtn,
    dateInput,

    // Background
    bgBtn,
    bgInput,

    // Drawer
    openSettings,
    closeSettings,
    settingsDrawer,
    settingsOverlay,

    // Drawer inputs
    titleInput,
    subtitleInput,
    subtitle2Input,
    emojiInput,

    // Milestone settings
    milestoneEnabled,
    milestoneDate,
    milestoneMsg,

    // Actions
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

// Milestone settings (default: off)
milestoneEnabled.checked = localStorage.getItem(LS.mEnabled) === "true";

const savedMilestoneMs = localStorage.getItem(LS.mDateMs);
if (savedMilestoneMs) {
    const ms = Number(savedMilestoneMs);
    if (!Number.isNaN(ms)) {
        milestoneDate.value = toDatetimeLocalValue(new Date(ms));
    }
}

milestoneMsg.value = getSavedOrDefault(LS.mMsg, "Almost there… 💗");

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

    // Save milestone settings
    localStorage.setItem(LS.mEnabled, String(milestoneEnabled.checked));
    localStorage.setItem(LS.mMsg, milestoneMsg.value.trim());

// Save milestone date as ms (if filled)
    if (milestoneDate.value) {
        const dt = new Date(milestoneDate.value);
        if (!Number.isNaN(dt.getTime())) {
            localStorage.setItem(LS.mDateMs, String(dt.getTime()));
        }
    } else {
        localStorage.removeItem(LS.mDateMs);
    }


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

function renderMilestone() {
    // 1) If disabled -> hide
    const enabled = localStorage.getItem(LS.mEnabled) === "true";
    if (!enabled) {
        milestoneCard.classList.add("hidden");
        milestoneCard.setAttribute("aria-hidden", "true");
        return;
    }

    // 2) Need a saved date
    const msStr = localStorage.getItem(LS.mDateMs);
    if (!msStr) {
        milestoneCard.classList.add("hidden");
        milestoneCard.setAttribute("aria-hidden", "true");
        return;
    }

    const targetMs = Number(msStr);
    if (Number.isNaN(targetMs)) return;

    const nowMs = Date.now();
    const diffMs = targetMs - nowMs;

    // 3) If in the past -> hide automatically
    if (diffMs <= 0) {
        milestoneCard.classList.add("hidden");
        milestoneCard.setAttribute("aria-hidden", "true");
        return;
    }

    // 4) Show + message
    milestoneCard.classList.remove("hidden");
    milestoneCard.setAttribute("aria-hidden", "false");

    const msg = localStorage.getItem(LS.mMsg);
    milestoneText.textContent = msg ? msg : "";

    // 5) Compute dd:hh:mm:ss
    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    mDays.textContent = String(days);
    mHours.textContent = pad2(hours);
    mMinutes.textContent = pad2(minutes);
    mSeconds.textContent = pad2(seconds);
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

        // Randomize layout + animation so we don't rely on nth-child CSS
        span.style.left = `${Math.random() * 100}%`;
        span.style.animationDuration = `${14 + Math.random() * 10}s`; // 14–24s
        span.style.animationDelay = `${Math.random() * 6}s`;         // 0–6s
        span.style.transform = `translateY(0) scale(${0.8 + Math.random() * 0.5})`;

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
   10) CLEAR BUTTON LOGIC
========================================================= */

// Select all clear buttons
const clearButtons = document.querySelectorAll('.clear-btn');

clearButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 1. Get the ID of the input this button controls
        const inputId = btn.getAttribute('data-for');
        const input = document.getElementById(inputId);

        if (input) {
            // 2. Clear the value
            input.value = "";

            // 3. Keep focus on the input so user can type immediately
            input.focus();
        }
    });
});
/* =========================================================
   11) START
========================================================= */

renderCountdown();
renderMilestone();
showSinceLastOpened();

setInterval(() => {
    renderCountdown();
    renderMilestone();
}, 1000);

/* =========================================================
   12) INTERACTIVE: GROWING EMOJI (Touch & Hold)
========================================================= */

let activeEmoji = null;
let growTimer = null;
let currentScale = 0;

// Helper to pick a random emoji
function getRandomEmoji() {
    const savedEmojis = localStorage.getItem("customEmojis") || "💗";
    const emojiList = savedEmojis.split(/\s+/).filter(Boolean);
    return emojiList[Math.floor(Math.random() * emojiList.length)];
}

// 1. START (Touch or Mouse Down)
function startGrow(e) {
    // Ignore clicks on buttons/inputs
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.drawer')) {
        return;
    }

    // Get position (touch or mouse)
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    // Create the element
    activeEmoji = document.createElement('div');
    activeEmoji.classList.add('touch-emoji');
    activeEmoji.textContent = getRandomEmoji();

    // Set initial position
    activeEmoji.style.left = x + 'px';
    activeEmoji.style.top = y + 'px';

    document.body.appendChild(activeEmoji);

    // Start growing loop
    currentScale = 0;
    growTimer = setInterval(() => {
        if (!activeEmoji) return;

        // Grow by 0.1 every 30ms
        currentScale += 0.05;

        // Cap the max size (e.g., 5x normal size)
        if (currentScale > 6) currentScale = 6;

        // Apply scale
        activeEmoji.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
    }, 20);
}

// 2. MOVE (Drag the growing emoji around)
function moveGrow(e) {
    if (!activeEmoji) return;

    // Prevent scrolling while dragging the emoji
    e.preventDefault();

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    activeEmoji.style.left = x + 'px';
    activeEmoji.style.top = y + 'px';
}

// 3. END (Release)
function endGrow() {
    if (!activeEmoji) return;

    // Stop growing
    clearInterval(growTimer);
    growTimer = null;

    // Trigger "Fly Away"
    // We move it 200px up from wherever it is currently
    const currentTop = parseFloat(activeEmoji.style.top);
    activeEmoji.classList.add('fly-away');
    activeEmoji.style.top = (currentTop - 300) + 'px'; // Float up 300px

    // Clean up DOM after animation finishes
    const elementToRemove = activeEmoji;
    activeEmoji = null; // Clear reference immediately so next tap starts fresh

    setTimeout(() => {
        elementToRemove.remove();
    }, 1000); // Matches CSS transition time
}

// Add Listeners (Support both Touch and Mouse)
document.addEventListener('mousedown', startGrow);
document.addEventListener('touchstart', startGrow, { passive: false });

document.addEventListener('mousemove', moveGrow);
document.addEventListener('touchmove', moveGrow, { passive: false });

document.addEventListener('mouseup', endGrow);
document.addEventListener('touchend', endGrow);

/* =========================================================
   13) MAGIC DUST TRAIL (Sparkles on Move)
========================================================= */

let lastDustTime = 0;

function createDust(e) {
    // 1. Limit the dust creation (Performance protection)
    // Only allow 1 particle every 40ms
    const now = Date.now();
    if (now - lastDustTime < 40) return;
    lastDustTime = now;

    // 2. Get coordinates (Touch or Mouse)
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    // 3. Create the sparkle element
    const dust = document.createElement('span');
    dust.classList.add('magic-dust');

    // You can use "✨" or mix it up with "💖", "⭐", "🌸"
    const sparkles = ["✨", "⭐", "💫"];
    dust.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];

    dust.style.left = x + 'px';
    dust.style.top = y + 'px';

    // Randomize slightly so it looks organic
    const randomOffset = (Math.random() - 0.5) * 20; // -10px to +10px
    dust.style.marginLeft = randomOffset + 'px';
    dust.style.marginTop = randomOffset + 'px';

    document.body.appendChild(dust);

    // 4. Cleanup
    setTimeout(() => {
        dust.remove();
    }, 800);
}

// Attach to movement events (Global)
document.addEventListener('mousemove', createDust);
document.addEventListener('touchmove', createDust, { passive: true });