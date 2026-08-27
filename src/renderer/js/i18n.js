// ============================================================
// ThreeMarket POS - Internationalization (i18n)
// Handles language switching and text translations.
// ============================================================

let currentLang = "en";
let currentTranslations = {};

// ============================================================
// Load Translations
// ============================================================

// ============================================================
// Load Translations
// Loads the selected language JSON file and stores it in
// currentTranslations before updating the page.
// ============================================================

async function loadTranslations() {
    try {
        currentLang = localStorage.getItem("tm_language") || "en";

        const response = await fetch(`/lang/${currentLang}.json`);

        // Make sure the language file was found successfully.
        if (!response.ok) {
            throw new Error(
                `Failed to load ${currentLang}.json - HTTP ${response.status}`
            );
        }

        // Parse the JSON file and store the translations.
        currentTranslations = await response.json();

        // Apply language direction and document language.
        document.documentElement.lang = currentLang;
        document.documentElement.dir =
            currentLang === "ar" ? "rtl" : "ltr";

        // Update all translated elements on the page.
        updatePageText();

        console.log(
            `[i18n] Loaded language: ${currentLang}`
        );

    } catch (error) {
        console.error(
            "[i18n] Failed to load translations:",
            error
        );

        // Keep the application usable if the language file fails.
        currentTranslations = {};
    }
}

// ============================================================
// Get Translation with Fallback
// Returns the key itself if translation not found
// ============================================================

function getTranslation(key) {
    if (!key) return "";

    const keys = key.split(".");
    let value = currentTranslations;

    for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
            value = value[k];
        } else {
            // Fallback: return the key itself (last part) if not found
            console.warn(`[i18n] Missing translation: ${key}`);
            const keyParts = key.split(".");
            return keyParts[keyParts.length - 1];
        }
    }

    return value || key;
}

// ============================================================
// Toggle Language
// ============================================================

async function toggleLanguage() {
    currentLang = currentLang === "en" ? "ar" : "en";
    localStorage.setItem("tm_language", currentLang);
    await loadTranslations();
}

// ============================================================
// Update Page Text
// Replaces all elements with data-i18n attribute
// ============================================================

function updatePageText() {
    // Update elements with data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const translation = getTranslation(key);
        if (translation) el.textContent = translation;
    });

    // Update placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        const translation = getTranslation(key);
        if (translation) el.placeholder = translation;
    });

    // Update document title if needed
    const titleKey = document.querySelector("title")?.getAttribute("data-i18n");
    if (titleKey) {
        document.title = getTranslation(titleKey);
    }

    // Update language toggle button label — shows the *other* language's name
    const langLabel = document.querySelector(".lang-label");
    if (langLabel) {
        langLabel.textContent = currentLang === "en" ? "العربية" : "English";
    }
}

// ============================================================
// Get Current Language
// ============================================================

function getCurrentLanguage() {
    return currentLang;
}

// ============================================================
// Export
// ============================================================

export {
    loadTranslations,
    toggleLanguage,
    getTranslation,
    getCurrentLanguage,
    updatePageText
};