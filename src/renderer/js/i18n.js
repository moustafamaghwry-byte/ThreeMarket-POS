const translations = {
    en: {
        login: {
            subtitle: "Retail Management System",
            username: "Username",
            password: "Password",
            button: "Login"
        }
    },

    ar: {
        login: {
            subtitle: "نظام إدارة التجزئة",
            username: "اسم المستخدم",
            password: "كلمة المرور",
            button: "تسجيل الدخول"
        }
    }
};

let currentLanguage = "en";

function getTranslation(key) {
    const keys = key.split(".");
    let value = translations[currentLanguage];

    for (const item of keys) {
        value = value?.[item];
    }

    return value || key;
}

function applyLanguage() {

    document.documentElement.lang = currentLanguage;
    document.documentElement.dir =
        currentLanguage === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;
        element.textContent = getTranslation(key);
    });

    const languageButton = document.getElementById("languageButton");

    if (languageButton) {
        languageButton.textContent =
            currentLanguage === "en" ? "العربية" : "English";
    }
}

function toggleLanguage() {

    currentLanguage =
        currentLanguage === "en" ? "ar" : "en";

    applyLanguage();
}

export {
    applyLanguage,
    toggleLanguage
};