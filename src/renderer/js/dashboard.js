import { applyLanguage, toggleLanguage } from "./i18n.js";

async function initializeDashboard() {
    try {
        const session = await window.api.getSession();

        // If there is no active session, return to Login
        if (!session) {
            window.location.href = "/";
            return;
        }

        // Display current user
        const usernameElement =
            document.getElementById("currentUsername");

        const roleElement =
            document.getElementById("currentRole");

        if (usernameElement) {
            usernameElement.textContent = session.username;
        }

        if (roleElement) {
            roleElement.textContent = session.role;
        }

        // Apply current language
        applyLanguage();

        // Language button
        const languageButton =
            document.getElementById("languageButton");

        if (languageButton) {
            languageButton.addEventListener(
                "click",
                toggleLanguage
            );
        }

        // Logout
        const logoutButton =
            document.getElementById("logoutButton");

        if (logoutButton) {
            logoutButton.addEventListener(
                "click",
                async () => {

                    const result =
                        await window.api.logout();

                    if (result.success) {
                        window.location.href = "/";
                    }

                }
            );
        }

        console.log("Dashboard initialized");
        console.log("Current session:", session);

    } catch (error) {
        console.error(
            "Dashboard initialization error:",
            error
        );

        window.location.href = "/";
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);