"use strict";

/**
 * Countdown + Settings app
 */

/* =========================================================
   1) CONFIG & DEFAULTS
========================================================= */

const currentYear = new Date().getFullYear();

// Default: Jan 1st of the NEXT year
let DEFAULT_TARGET_DATE = new Date(currentYear + 1, 0, 1, 0, 0, 0);

// Default Text
const DEFAULT_TITLE = "Countdown to " + (currentYear + 1); // e.g. "Countdown to 2027"
const DEFAULT_SUBTITLE = "Time remaining:";
const DEFAULT_SUBTITLE2 = "Happy New Year!";
const DEFAULT_EMOJIS = "💗 ❄️️ 🌼 ☔ ♥️ 💦 🥳 🥰";

const MAX_CONFETTI_COUNT = 40;
const BG_MAX_WIDTH = 1080;
const BG_JPEG_QUALITY = 0.85;

// Storage Keys
const LS = {
    title: "customTitle",
    subtitle: "customSubtitle",
    subtitle2: "customSubtitle2",
    emojis: "customEmojis",
    bg: "customBg",
    dateMs: "customDateMs",
    lastOpenedMs: "lastOpenedMs",
    mEnabled: "milestoneEnabled",
    mDateMs: "milestoneDateMs",
    mMsg: "milestoneMsg"
};

/* =========================================================
   2) STARTUP LOGIC
========================================================= */

// Track "Since last opened"
const lastOpenedMs = Number(localStorage.getItem(LS.lastOpenedMs) || "0");
localStorage.setItem(LS.lastOpenedMs, String(Date.now()));

let timeAwayMs = 0;
if (lastOpenedMs > 0) {
    timeAwayMs = Date.now() - lastOpenedMs;
}

console.log("script loaded ✅");

/* =========================================================
   3) DOM ELEMENTS
========================================================= */

// Main Text
const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const subtitle2El = document.getElementById("subtitle2");
const sinceLineEl = document.getElementById("sinceLine");

// Countdown
const el = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
    targetLine: document.getElementById("targetLine"),
};

// Milestone Display
const milestoneCard = document.getElementById("milestoneCard");
const milestoneText = document.getElementById("milestoneText");
const mDays = document.getElementById("mDays");
const mHours = document.getElementById("mHours");
const mMinutes = document.getElementById("mMinutes");
const mSeconds = document.getElementById("mSeconds");

// Settings Drawer
const openSettings = document.getElementById("openSettings");
const closeSettings = document.getElementById("closeSettings");
const settingsDrawer = document.getElementById("settingsDrawer");
const settingsOverlay = document.getElementById("settingsOverlay");

// Inputs
const titleInput = document.getElementById("titleInput");
const subtitleInput = document.getElementById("subtitleInput");
const subtitle2Input = document.getElementById("subtitle2Input");
const emojiInput = document.getElementById("emojiInput");

const milestoneEnabled = document.getElementById("milestoneEnabled");
const milestoneDate = document.getElementById("milestoneDate");
const milestoneMsg = document.getElementById("milestoneMsg");

// Buttons
const saveText = document.getElementById("saveText");
const resetText = document.getElementById("resetText");
const dateBtn = document.getElementById("dateBtn");
const dateInput = document.getElementById("dateInput");
const bgBtn = document.getElementById("bgBtn");
const bgInput = document.getElementById("bgInput");

/* =========================================================
   4) LOAD SAVED SETTINGS
========================================================= */

// Helper to keep empty strings valid
function getSavedOrDefault(key, defaultValue) {
    const v = localStorage.getItem(key);
    return v === null ? defaultValue : v;
}

// Load Text
titleEl.textContent = getSavedOrDefault(LS.title, DEFAULT_TITLE);
subtitleEl.textContent = getSavedOrDefault(LS.subtitle, DEFAULT_SUBTITLE);
subtitle2El.textContent = getSavedOrDefault(LS.subtitle2, DEFAULT_SUBTITLE2);

// Load Emojis
emojiInput.value = localStorage.getItem(LS.emojis) || DEFAULT_EMOJIS;
applyConfettiEmojis(emojiInput.value);

// Load Date
const savedDateMs = localStorage.getItem(LS.dateMs);
if (savedDateMs && !Number.isNaN(Number(savedDateMs))) {
    DEFAULT_TARGET_DATE = new Date(Number(savedDateMs));
}

// Load Background
const savedBackground = localStorage.getItem(LS.bg);
if (savedBackground) {
    setBackground(savedBackground);
}

// Load Milestone
milestoneEnabled.checked = localStorage.getItem(LS.mEnabled) === "true";
const savedMilestoneMs = localStorage.getItem(LS.mDateMs);
if (savedMilestoneMs && !Number.isNaN(Number(savedMilestoneMs))) {
    milestoneDate.value = toDatetimeLocalValue(new Date(Number(savedMilestoneMs)));
}
milestoneMsg.value = getSavedOrDefault(LS.mMsg, "Almost there… 💗");


/* =========================================================
   5) DRAWER ACTIONS (SAVE / RESET)
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

openSettings.addEventListener("click", () => {
    // Sync inputs with current text before opening
    titleInput.value = titleEl.textContent;
    subtitleInput.value = subtitleEl.textContent;
    subtitle2Input.value = subtitle2El.textContent;
    emojiInput.value = localStorage.getItem(LS.emojis) || DEFAULT_EMOJIS;
    openDrawer();
});

closeSettings.addEventListener("click", closeDrawer);
settingsOverlay.addEventListener("click", closeDrawer);

// --- SAVE ---
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

    const emojis = emojiInput.value.trim() || DEFAULT_EMOJIS;
    localStorage.setItem(LS.emojis, emojis);
    applyConfettiEmojis(emojis);

    // Save Milestone
    localStorage.setItem(LS.mEnabled, String(milestoneEnabled.checked));
    localStorage.setItem(LS.mMsg, milestoneMsg.value.trim());

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

// --- RESET ---
resetText.addEventListener("click", () => {
    // 1. Reset Main Text
    titleEl.textContent = DEFAULT_TITLE;
    localStorage.removeItem(LS.title);

    subtitleEl.textContent = DEFAULT_SUBTITLE;
    localStorage.removeItem(LS.subtitle);

    subtitle2El.textContent = DEFAULT_SUBTITLE2;
    localStorage.removeItem(LS.subtitle2);

    // 2. Reset Emojis
    emojiInput.value = DEFAULT_EMOJIS;
    localStorage.removeItem(LS.emojis);
    applyConfettiEmojis(DEFAULT_EMOJIS);

    // 3. Reset Milestone
    localStorage.removeItem(LS.mEnabled);
    localStorage.removeItem(LS.mDateMs);
    localStorage.removeItem(LS.mMsg);

    milestoneEnabled.checked = false;
    milestoneDate.value = "";
    milestoneMsg.value = "";
    renderMilestone(); // Hide immediately

    // 4. Update Inputs
    titleInput.value = titleEl.textContent;
    subtitleInput.value = subtitleEl.textContent;
    subtitle2Input.value = subtitle2El.textContent;
});

/* =========================================================
   6) BACKGROUND & DATE PICKERS
========================================================= */

bgBtn.addEventListener("click", () => bgInput.click());

bgInput.addEventListener("change", () => {
    const file = bgInput.files && bgInput.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            const resized = resizeImageToDataUrl(img, BG_MAX_WIDTH, BG_JPEG_QUALITY);
            setBackground(resized);
            localStorage.setItem(LS.bg, resized);
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});

function setBackground(dataUrl) {
    document.body.style.backgroundImage =
        `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${dataUrl})`;
}

function resizeImageToDataUrl(img, maxWidth, quality) {
    let width = img.width;
    let height = img.height;
    if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
}

// Date Picker Logic
dateBtn.addEventListener("click", () => {
    if (dateInput.classList.contains("date-hidden")) {
        dateInput.classList.remove("date-hidden");
        dateInput.value = toDatetimeLocalValue(DEFAULT_TARGET_DATE);
    } else {
        dateInput.classList.add("date-hidden");
        dateInput.blur();
    }
});

dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;
    const next = new Date(dateInput.value);
    if (!Number.isNaN(next.getTime())) {
        DEFAULT_TARGET_DATE = next;
        localStorage.setItem(LS.dateMs, String(DEFAULT_TARGET_DATE.getTime()));
        renderCountdown();
    }
});

function toDatetimeLocalValue(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* =========================================================
   7) RENDER LOOPS (Countdown & Milestone)
========================================================= */

function pad2(n) { return String(n).padStart(2, "0"); }

function renderCountdown() {
    const now = new Date();
    const diffMs = DEFAULT_TARGET_DATE - now;

    el.targetLine.textContent = "Target: " + DEFAULT_TARGET_DATE.toLocaleString();

    if (diffMs <= 0) {
        el.days.textContent = "0";
        el.hours.textContent = "00";
        el.minutes.textContent = "00";
        el.seconds.textContent = "00";
        return;
    }

    const totalSec = Math.floor(diffMs / 1000);
    el.days.textContent = String(Math.floor(totalSec / 86400));
    el.hours.textContent = pad2(Math.floor((totalSec % 86400) / 3600));
    el.minutes.textContent = pad2(Math.floor((totalSec % 3600) / 60));
    el.seconds.textContent = pad2(totalSec % 60);
}

function renderMilestone() {
    const enabled = localStorage.getItem(LS.mEnabled) === "true";
    const msStr = localStorage.getItem(LS.mDateMs);

    if (!enabled || !msStr) {
        milestoneCard.classList.add("hidden");
        milestoneCard.setAttribute("aria-hidden", "true");
        return;
    }

    const targetMs = Number(msStr);
    const nowMs = Date.now();
    const diffMs = targetMs - nowMs;

    if (diffMs <= 0) {
        milestoneCard.classList.add("hidden");
        milestoneCard.setAttribute("aria-hidden", "true");
        return;
    }

    milestoneCard.classList.remove("hidden");
    milestoneCard.setAttribute("aria-hidden", "false");
    milestoneText.textContent = localStorage.getItem(LS.mMsg) || "";

    const totalSec = Math.floor(diffMs / 1000);
    mDays.textContent = String(Math.floor(totalSec / 86400));
    mHours.textContent = pad2(Math.floor((totalSec % 86400) / 3600));
    mMinutes.textContent = pad2(Math.floor((totalSec % 3600) / 60));
    mSeconds.textContent = pad2(totalSec % 60);
}

/* =========================================================
   8) CONFETTI & SINCE LAST OPENED
========================================================= */

function applyConfettiEmojis(emojiString) {
    const container = document.querySelector(".confetti");
    if (!container) return;

    const list = emojiString.split(/\s+/).filter(Boolean);
    const emojis = list.length ? list : ["💗"];
    container.innerHTML = "";

    for (let i = 0; i < MAX_CONFETTI_COUNT; i++) {
        const span = document.createElement("span");
        span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        span.style.left = `${Math.random() * 100}%`;
        span.style.animationDuration = `${14 + Math.random() * 10}s`;
        span.style.animationDelay = `${Math.random() * 6}s`;
        span.style.transform = `translateY(0) scale(${0.8 + Math.random() * 0.5})`;
        container.appendChild(span);
    }
}

function showSinceLastOpened() {
    sinceLineEl.textContent = "";
    sinceLineEl.style.opacity = "1";

    if (timeAwayMs < 5000) return;

    const sec = Math.floor(timeAwayMs / 1000);
    let text = `${sec} seconds`;
    if (sec >= 60) {
        const min = Math.floor(sec / 60);
        text = `${min} minute${min === 1 ? "" : "s"}`;
        if (min >= 60) {
            const hr = Math.floor(min / 60);
            text = `${hr} hour${hr === 1 ? "" : "s"}`;
            if (hr >= 24) {
                const d = Math.floor(hr / 24);
                text = `${d} day${d === 1 ? "" : "s"}`;
            }
        }
    }

    sinceLineEl.textContent = `While you were away, ${text} passed 💗`;
    setTimeout(() => { sinceLineEl.style.opacity = "0"; }, 5000);
}

/* =========================================================
   9) CLEAR BUTTONS (Logic)
========================================================= */
document.querySelectorAll('.clear-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.getAttribute('data-for'));
        if (input) {
            input.value = "";
            input.focus();
        }
    });
});

/* =========================================================
   10) INTERACTIVE: GROWING EMOJI
========================================================= */
let activeEmoji = null;
let growTimer = null;
let currentScale = 0;

function getRandomEmoji() {
    const list = (localStorage.getItem(LS.emojis) || "💗").split(/\s+/).filter(Boolean);
    return list[Math.floor(Math.random() * list.length)];
}

function startGrow(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.drawer')) return;

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    activeEmoji = document.createElement('div');
    activeEmoji.classList.add('touch-emoji');
    activeEmoji.textContent = getRandomEmoji();
    activeEmoji.style.left = x + 'px';
    activeEmoji.style.top = y + 'px';
    document.body.appendChild(activeEmoji);

    currentScale = 0;
    growTimer = setInterval(() => {
        if (!activeEmoji) return;
        currentScale += 0.05;
        if (currentScale > 6) currentScale = 6;
        activeEmoji.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
    }, 20);
}

function moveGrow(e) {
    if (!activeEmoji) return;
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    activeEmoji.style.left = x + 'px';
    activeEmoji.style.top = y + 'px';
}

function endGrow() {
    if (!activeEmoji) return;
    clearInterval(growTimer);
    growTimer = null;

    const currentTop = parseFloat(activeEmoji.style.top);
    activeEmoji.classList.add('fly-away');
    activeEmoji.style.top = (currentTop - 300) + 'px';

    const el = activeEmoji;
    activeEmoji = null;
    setTimeout(() => el.remove(), 1000);
}

document.addEventListener('mousedown', startGrow);
document.addEventListener('touchstart', startGrow, { passive: false });
document.addEventListener('mousemove', moveGrow);
document.addEventListener('touchmove', moveGrow, { passive: false });
document.addEventListener('mouseup', endGrow);
document.addEventListener('touchend', endGrow);

/* =========================================================
   11) MAGIC DUST (Sparkles)
========================================================= */
let lastDustTime = 0;

function createDust(e) {
    const now = Date.now();
    if (now - lastDustTime < 40) return;
    lastDustTime = now;

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    const dust = document.createElement('span');
    dust.classList.add('magic-dust');

    const sparkles = ["✨", "⭐", "💫"];
    dust.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];

    dust.style.left = x + 'px';
    dust.style.top = y + 'px';
    const offset = (Math.random() - 0.5) * 20;
    dust.style.marginLeft = offset + 'px';
    dust.style.marginTop = offset + 'px';

    document.body.appendChild(dust);
    setTimeout(() => dust.remove(), 800);
}

document.addEventListener('mousemove', createDust);
document.addEventListener('touchmove', createDust, { passive: true });

/* =========================================================
   13) REMINDER SYSTEM
========================================================= */

// --- A. SETTINGS DRAWER (Create New) ---
const reminderList = document.getElementById("reminderList");
const reminderInputMsg = document.getElementById("reminderInputMsg");   // The "Create" Input
const reminderInputDate = document.getElementById("reminderInputDate"); // The "Create" Date
const saveReminderBtn = document.getElementById("saveReminderBtn");
const addToCalendarBtn = document.getElementById("addToCalendarBtn");

// --- B. EDIT MODAL (Edit Existing) ---
const editModal = document.getElementById("editModal");
const editInputMsg = document.getElementById("editInputMsg");           // The "Edit" Input
const editInputDate = document.getElementById("editInputDate");         // The "Edit" Date
const confirmEditBtn = document.getElementById("confirmEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// Storage Key
const LS_REMINDERS_KEY = "myRemindersList";
let reminders = JSON.parse(localStorage.getItem(LS_REMINDERS_KEY)) || [];
let overdueCheckerInterval;
let currentEditingId = null; // Track which ID we are currently editing

// ========================================================
//  PART 1: CREATE NEW REMINDER
// ========================================================
saveReminderBtn.addEventListener("click", () => {
    const msg = reminderInputMsg.value.trim();
    const date = reminderInputDate.value;

    if (!msg) {
        alert("Please write a message!");
        return;
    }

    // 1. Create Object
    const newReminder = {
        id: Date.now(),
        msg: msg,
        date: date
    };

    // 2. Add to list
    reminders.push(newReminder);
    saveData();
    renderReminders();

    // 3. Clear "Create" inputs & Close Drawer
    reminderInputMsg.value = "";
    reminderInputDate.value = "";
    closeDrawer();
});


// ========================================================
//  PART 2: EDIT EXISTING REMINDER (The Popup Logic)
// ========================================================

// Open the Modal
window.editReminder = function(id) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    // 1. Save the ID we are working on
    currentEditingId = id;

    // 2. Fill the POPUP inputs (not the settings inputs)
    editInputMsg.value = reminder.msg;
    editInputDate.value = reminder.date || "";

    // 3. Show the modal
    editModal.classList.remove("hidden");
};

// Save Changes (Confirm Button)
confirmEditBtn.addEventListener("click", () => {
    if (!currentEditingId) return;

    // 1. Find the reminder
    const index = reminders.findIndex(r => r.id === currentEditingId);
    if (index > -1) {
        // 2. Update its data
        reminders[index].msg = editInputMsg.value.trim();
        reminders[index].date = editInputDate.value;

        // 3. Save & Render
        saveData();
        renderReminders();
    }

    // 4. Close Modal
    editModal.classList.add("hidden");
    currentEditingId = null;
});

// Cancel Edit
cancelEditBtn.addEventListener("click", () => {
    editModal.classList.add("hidden");
    currentEditingId = null;
});


// ========================================================
//  PART 3: SHARED LOGIC (Render & Delete)
// ========================================================

function renderReminders() {
    reminderList.innerHTML = "";

    // Sort: Date set first, then others
    reminders.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
    });

    reminders.forEach(reminder => {
        const card = document.createElement("div");
        card.className = "reminder-note";

        // Overdue Check
        if (reminder.date) {
            if (new Date().getTime() > new Date(reminder.date).getTime()) {
                card.classList.add("is-overdue");
            }
        }

        // Display Date
        let dateDisplay = "";
        if (reminder.date) {
            const d = new Date(reminder.date);
            dateDisplay = d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        card.innerHTML = `
            <div class="reminder-content">
                <div class="reminder-text-group">
                    <strong dir="auto">${reminder.msg}</strong>
                    <small>${dateDisplay}</small>
                </div>
            </div>
            <div class="reminder-actions">
                <button class="action-btn edit-btn" onclick="editReminder(${reminder.id})">✏️</button>
                <button class="action-btn done-btn" onclick="deleteReminder(${reminder.id})">✓</button>
            </div>
        `;
        reminderList.appendChild(card);
    });
}

window.deleteReminder = function(id) {
    if(confirm("Delete this reminder?")) {
        reminders = reminders.filter(r => r.id !== id);
        saveData();
        renderReminders();
    }
};

function saveData() {
    localStorage.setItem(LS_REMINDERS_KEY, JSON.stringify(reminders));
}

// Add to Calendar (Uses the Settings Input)
addToCalendarBtn.addEventListener("click", () => {
    const msg = reminderInputMsg.value.trim();
    const dateVal = reminderInputDate.value;
    if (!msg || !dateVal) { alert("Please fill the message and date to add to calendar."); return; }

    const startDate = new Date(dateVal);
    const endDate = new Date(startDate.getTime() + 60*60*1000);
    const formatDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
        `DTSTART:${formatDate(startDate)}`, `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${msg}`, "END:VEVENT", "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reminder.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Initial Load
renderReminders();
/* =========================================================
   12) INITIALIZE
========================================================= */
renderCountdown();
renderMilestone();
showSinceLastOpened();
setInterval(() => {
    renderCountdown();
    renderMilestone();
}, 1000);