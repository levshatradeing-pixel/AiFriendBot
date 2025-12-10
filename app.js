// app.js (полный файл)

const tg = window.Telegram.WebApp;
tg.expand();

tg.MainButton.text = "Next";
tg.MainButton.hide();

// -----------------------------
// GLOBAL STATE
// -----------------------------
let currentStep = 1;
let saveInProgress = false;

// -----------------------------
// ERROR UI
// -----------------------------
function showError(msg) {
    const box = document.getElementById("error-box");
    box.textContent = msg;
    box.classList.remove("hidden");
    tg.MainButton.hide();
}
function clearError() {
    const box = document.getElementById("error-box");
    box.classList.add("hidden");
    box.textContent = "";
}

// -----------------------------
// SCROLL HELPER
// -----------------------------
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// -----------------------------
// STEP 1 DATA
// -----------------------------
let appearance = {
    gender: null,
    ethnicity: null,
    age_group: null,
    eye_color: null,
    hair_style: null,
    hair_color: null,
    body_shape: null,
    style_vibe: null,
    portrait_seed: null
};

// -----------------------------
// STEP 2 DICTIONARIES
// -----------------------------
const TRAITS = [
    "Kind", "Shy", "Confident", "Playful", "Serious", "Romantic",
    "Sarcastic", "Caring", "Bold", "Energetic"
];
const INTERESTS = [
    "Music", "Sports", "Art", "Reading", "Travel", "Cooking",
    "Gaming", "Dancing", "Fashion", "Outdoors"
];
const OCCUPATIONS = [
    "Student", "Engineer", "Designer", "Artist", "Writer",
    "Model", "Nurse", "Teacher", "Entrepreneur", "Other"
];

// -----------------------------
// STEP 2 DATA
// -----------------------------
let personality = {
    character_name: "",
    character_age: null,
    personality_traits: [],
    interests: [],
    occupation: null
};

// -----------------------------
// PREVIEW UPDATE
// -----------------------------
function updatePreview() {
    const body = document.querySelector("#character-preview .preview-body");

    if (!window.appearanceData) {
        body.textContent = "Complete Step 1 to see your character preview.";
        return;
    }

    const a = window.appearanceData;
    const p = personality;

    const line1 = `${p.character_age || "??"}yo ${a.ethnicity || "?"} ${a.body_shape || "?"} ${a.gender || "?"}, ${a.style_vibe || "?"} style`;
    const traitsStr = p.personality_traits.length ? p.personality_traits.join(", ") : "None";
    const line2 = `Name: ${p.character_name || "Unnamed"} • Traits: ${traitsStr} • Occupation: ${p.occupation || "?"}`;

    body.innerHTML = `${line1}<br>${line2}`;
}

// -----------------------------
// RENDER CHIPS FOR STEP 2
// -----------------------------
function renderChips(list, containerId, isMulti) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    list.forEach(item => {
        const div = document.createElement("div");
        div.className = "chip";
        div.textContent = item;

        div.addEventListener("click", () => {
            if (isMulti) div.classList.toggle("selected");
            else {
                container.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
                div.classList.add("selected");
            }
            clearError();
            validateStep2();
            refreshMainButton();
            updatePreview();
            scrollToTop();
        });

        container.appendChild(div);
    });
}

renderChips(TRAITS, "traits_container", true);
renderChips(INTERESTS, "interests_container", true);
renderChips(OCCUPATIONS, "occupation_container", false);

// -----------------------------
// UI TRANSITIONS
// -----------------------------
function fadeOutAndSwitch(oldEl, newEl) {
    oldEl.classList.remove("show");
    oldEl.classList.add("fade");

    setTimeout(() => {
        oldEl.classList.add("hidden");
        newEl.classList.remove("hidden");
        newEl.classList.add("show");

        currentStep = 2;
        scrollToTop();

        setTimeout(() => document.getElementById("char_name").focus(), 200);
    }, 250);
}

// -----------------------------
// INITIAL LOAD
// -----------------------------
async function loadInitialData() {
    try {
        const res = await fetch("/api/webapp/character/init", {
            headers: { "X-Telegram-Init-Data": tg.initData }
        });

        const json = await res.json();

        document.getElementById("loading").classList.add("hidden");
        const app = document.getElementById("app");
        app.classList.remove("hidden");
        app.classList.add("show");

        if (json.status !== "ok") {
            showError("Failed to load data");
            return;
        }

        const character = json.data.character;

        if (character) {
            applyCharacterData(character);
            window.appearanceData = appearance;

            fadeOutAndSwitch(document.getElementById("step1"), document.getElementById("step2"));

            tg.MainButton.text = "Save Character";
            validateStep2();
            refreshMainButton();
            updatePreview();

            document.getElementById("char_age").addEventListener("focus", scrollToTop);

            scrollToTop();
        }
    } catch (e) {
        document.getElementById("loading").classList.add("hidden");
        const app = document.getElementById("app");
        app.classList.remove("hidden");
        app.classList.add("show");
        showError("Connection error");
    }
}

loadInitialData();

// -----------------------------
// APPLY CHARACTER DATA
// -----------------------------
function applyCharacterData(character) {
    const a = character.appearance || {};

    appearance.gender = a.gender || null;
    appearance.ethnicity = a.ethnicity || null;
    appearance.age_group = a.age_group || null;
    appearance.eye_color = a.eye_color || null;
    appearance.hair_style = a.hair_style || null;
    appearance.hair_color = a.hair_color || null;
    appearance.body_shape = a.body_shape || null;
    appearance.style_vibe = a.style_vibe || null;
    appearance.portrait_seed = a.portrait_seed || null;

    Object.keys(appearance).forEach(key => {
        if (key === "portrait_seed") return;

        const val = appearance[key];
        if (!val) return;

        const section = document.querySelector(`#step1 [data-field="${key}"]`);
        if (!section) return;

        section.querySelectorAll(".chip").forEach(c => {
            if (c.textContent.trim().toLowerCase() === val.toLowerCase()) {
                c.classList.add("selected");
            }
        });
    });

    const p = character.personality || {};

    personality.character_name = p.character_name || "";
    personality.character_age = p.character_age || null;
    personality.personality_traits = p.personality_traits || [];
    personality.interests = p.interests || [];
    personality.occupation = p.occupation || null;

    document.getElementById("char_name").value = personality.character_name;
    document.getElementById("char_age").value = personality.character_age;

    document.querySelectorAll("#traits_container .chip").forEach(c => {
        if (personality.personality_traits.includes(c.textContent.trim())) {
            c.classList.add("selected");
        }
    });

    document.querySelectorAll("#interests_container .chip").forEach(c => {
        if (personality.interests.includes(c.textContent.trim())) {
            c.classList.add("selected");
        }
    });

    document.querySelectorAll("#occupation_container .chip").forEach(c => {
        if (c.textContent.trim() === personality.occupation) {
            c.classList.add("selected");
        }
    });

    updatePreview();
    refreshMainButton();
}

// -----------------------------
// VALIDATION HELPERS
// -----------------------------
function checkAppearanceValid() {
    return (
        appearance.gender &&
        appearance.ethnicity &&
        appearance.age_group &&
        appearance.eye_color &&
        appearance.hair_style &&
        appearance.hair_color &&
        appearance.body_shape &&
        appearance.style_vibe
    );
}

function checkPersonalityValid() {
    return (
        personality.character_name.length > 0 &&
        personality.character_age >= 18 &&
        personality.character_age <= 80 &&
        personality.personality_traits.length > 0 &&
        personality.interests.length > 0 &&
        personality.occupation
    );
}

// -----------------------------
// UNIFIED MAINBUTTON LOGIC
// -----------------------------
function refreshMainButton() {
    if (currentStep === 1) {
        checkAppearanceValid() ? tg.MainButton.show() : tg.MainButton.hide();
    } else {
        checkPersonalityValid() ? tg.MainButton.show() : tg.MainButton.hide();
    }
}

// -----------------------------
// STEP 1 LISTENERS
// -----------------------------
document.querySelectorAll("#step1 .section").forEach(section => {
    const field = section.getAttribute("data-field");
    const chips = section.querySelectorAll(".chip");

    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            clearError();

            chips.forEach(c => c.classList.remove("selected"));
            chip.classList.add("selected");

            appearance[field] = chip.textContent.trim();

            refreshMainButton();
        });
    });
});

// -----------------------------
// STEP 2 LISTENERS
// -----------------------------
document.getElementById("char_name").addEventListener("input", () => {
    personality.character_name = document.getElementById("char_name").value.trim();
    refreshMainButton();
    updatePreview();
    scrollToTop();
});

document.getElementById("char_age").addEventListener("input", () => {
    let ageVal = document.getElementById("char_age").value;
    personality.character_age = ageVal ? parseInt(ageVal) : null;
    refreshMainButton();
    updatePreview();
    scrollToTop();
});

document.getElementById("char_age").addEventListener("focus", scrollToTop);

// -----------------------------
// MAIN BUTTON HANDLER
// -----------------------------
tg.MainButton.onClick(async () => {
    if (saveInProgress) return;
    saveInProgress = true;

    const isStep2 = currentStep === 2;

    if (!isStep2) {
        window.appearanceData = appearance;
        fadeOutAndSwitch(document.getElementById("step1"), document.getElementById("step2"));
        tg.MainButton.text = "Save Character";
        tg.MainButton.hide();
        currentStep = 2;
        scrollToTop();
        saveInProgress = false;
        return;
    }

    if (!checkPersonalityValid() || !checkAppearanceValid()) {
        showError("Fill all fields correctly.");
        saveInProgress = false;
        return;
    }

    await saveCharacter();
    saveInProgress = false;
});

// -----------------------------
// SAVE CHARACTER
// -----------------------------
async function saveCharacter() {
    clearError();

    try {
        if (!appearance.portrait_seed) {
            appearance.portrait_seed = Math.floor(Math.random() * 1_000_000_000);
        }

        const res = await fetch("/api/webapp/character/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                telegram_init_data: tg.initData,
                character: {
                    appearance: appearance,
                    personality: personality
                }
            })
        });

        const json = await res.json();

        if (json.status === "ok") {
            tg.close();
        } else {
            appearance.portrait_seed = null;
            showError(json.message || "Unknown error");
        }
    } catch (e) {
        appearance.portrait_seed = null;
        showError("Connection error");
    }
}
