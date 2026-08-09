let translations = {};
let currentLanguage = localStorage.getItem("language") || "en";

async function loadTranslations() {
    try {
        const response = await fetch(
            `/lang/${currentLanguage}.json`
        );

        if (!response.ok) {
            throw new Error(
                `Failed to load ${currentLanguage}.json`
            );
        }

        translations = await response.json();

        applyLanguage();

    } catch (error) {
        console.error(
            "Translation loading error:",
            error
        );
    }
}

function getTranslation(key) {
    const keys = key.split(".");
    let value = translations;

    for (const item of keys) {
        value = value?.[item];
    }

    return value ?? key;
}

function applyLanguage() {

    document.documentElement.lang =
        currentLanguage;

    document.documentElement.dir =
        currentLanguage === "ar"
            ? "rtl"
            : "ltr";

    document
        .querySelectorAll("[data-i18n]")
        .forEach((element) => {

            const key =
                element.dataset.i18n;

            element.textContent =
                getTranslation(key);
        });

    const languageButton =
        document.getElementById(
            "languageButton"
        );

    if (languageButton) {

        languageButton.textContent =
            currentLanguage === "en"
                ? "العربية"
                : "English";
    }
}

async function toggleLanguage() {

    currentLanguage =
        currentLanguage === "en"
            ? "ar"
            : "en";

    localStorage.setItem(
        "language",
        currentLanguage
    );

    await loadTranslations();
}

export {
    loadTranslations,
    applyLanguage,
    toggleLanguage,
    getTranslation
};