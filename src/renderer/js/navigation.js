// ============================================================
// ThreeMarket POS - Navigation
// Handles page routing, active navigation state,
// role-based page visibility, and redirect loop protection.
// ============================================================

import permissionsConfig from "../config/permissions.config.json";


// ============================================================
// Configuration
// ============================================================

const PAGE_ROUTES = permissionsConfig.pageRoutes || {};

const ROLE_PRESETS = permissionsConfig.rolePresets || {};


// ============================================================
// Redirect Loop Protection
// ============================================================

const REDIRECT_KEY = "tm_redirect_count";
const REDIRECT_TS_KEY = "tm_redirect_ts";

function checkRedirectLoop() {

    const now = Date.now();

    const lastTs = parseInt(
        sessionStorage.getItem(
            REDIRECT_TS_KEY
        ) || "0",
        10
    );

    let count = parseInt(
        sessionStorage.getItem(
            REDIRECT_KEY
        ) || "0",
        10
    );

    // Reset counter after five seconds.
    if (now - lastTs > 5000) {
        count = 0;
    }

    count++;

    sessionStorage.setItem(
        REDIRECT_KEY,
        String(count)
    );

    sessionStorage.setItem(
        REDIRECT_TS_KEY,
        String(now)
    );

    if (count > 2) {

        console.error(
            "[NAV] Redirect loop detected."
        );

        alert(
            "Navigation error detected. Please restart the application."
        );

        return true;
    }

    return false;
}


// ============================================================
// Get Current Page
// ============================================================

function getCurrentPage() {

    const currentPath =
        window.location.pathname
            .toLowerCase();

    for (
        const [page, route]
        of Object.entries(PAGE_ROUTES)
    ) {

        if (
            currentPath.includes(
                String(route).toLowerCase()
            )
        ) {
            return page;
        }
    }

    return null;
}


// ============================================================
// Set Active Navigation Item
// ============================================================

function setActiveNavItem() {

    const currentPage =
        getCurrentPage();

    document
        .querySelectorAll(".nav-item")
        .forEach((item) => {

            item.classList.remove(
                "active"
            );

            if (
                item.dataset.page ===
                currentPage
            ) {
                item.classList.add(
                    "active"
                );
            }
        });
}


// ============================================================
// Apply Role Based Access
// ============================================================

function applyRoleBasedAccess(session) {

    const role =
        session?.role || "";

    const userPermissions =
        session?.permissions || {};

    const rolePermissions =
        ROLE_PRESETS[role] || {};

    const permissions = {
        ...rolePermissions,
        ...userPermissions
    };

    console.log(
        "[NAV] Role:",
        role
    );

    console.log(
        "[NAV] Permissions:",
        permissions
    );


    document
        .querySelectorAll(".nav-item")
        .forEach((item) => {

            const page =
                item.dataset.page;

            const permission =
                permissions[page] || "none";


            if (
                permission ===
                "none"
            ) {

                item.style.display =
                    "none";

            } else {

                item.style.display =
                    "";
            }
        });
}


// ============================================================
// Navigate To Page
// ============================================================

function navigateTo(page) {

    const target =
        PAGE_ROUTES[page];

    if (!target) {

        console.error(
            "[NAV] Route not found:",
            page
        );

        return;
    }

    console.log(
        "[NAV] Navigating to:",
        page,
        "->",
        target
    );

    window.location.href =
        target;
}


// ============================================================
// Initialize Navigation
// ============================================================

function initializeNavigation() {

    setActiveNavItem();


    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach((item) => {

            item.addEventListener(
                "click",
                () => {

                    const page =
                        item.dataset.page;

                    if (!page) {
                        return;
                    }

                    navigateTo(page);
                }
            );
        });
}


// ============================================================
// Exports
// ============================================================

export {
    navigateTo,
    initializeNavigation,
    setActiveNavItem,
    applyRoleBasedAccess,
    checkRedirectLoop,
    getCurrentPage,
    PAGE_ROUTES,
    ROLE_PRESETS
};