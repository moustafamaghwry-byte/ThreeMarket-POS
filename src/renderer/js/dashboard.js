import {
    loadTranslations,
    toggleLanguage
} from "./i18n.js";

import { initializeNavigation } from "./navigation.js";

import { loadAppShell } from "./component-loader.js";


async function initializeDashboard() {

    try {

        // Check session first
        const session = await window.api.getSession();

        if (!session) {

            window.location.href = "/";

            return;
        }


        // Load Sidebar + Topbar
        await loadAppShell();


        // Display current user
        const usernameElement =
            document.getElementById("currentUsername");

        const roleElement =
            document.getElementById("currentRole");


        if (usernameElement) {

            usernameElement.textContent =
                session.username;
        }


        if (roleElement) {

            roleElement.textContent =
                session.role;
        }


        // Apply translations
        await loadTranslations();


        // Initialize navigation
        initializeNavigation();


        // Language button
        const languageButton =
            document.getElementById("languageButton");


        if (languageButton) {

            languageButton.addEventListener(
                "click",
                toggleLanguage
            );
        }


        // Logout button
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


        console.log(
            "Dashboard initialized successfully"
        );

        console.log(
            "Current session:",
            session
        );


    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );

    }

}


document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);