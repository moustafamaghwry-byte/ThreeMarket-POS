// ============================================================
// ThreeMarket POS - Component Loader
// Loads shared application components and page content dynamically.
// ============================================================

async function loadComponent(containerId, componentPath) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.warn(`[COMPONENT] Container not found: #${containerId}`);
        return false;
    }

    try {
        const response = await fetch(componentPath);

        if (!response.ok) {
            throw new Error(
                `Failed to load component: ${componentPath}`
            );
        }

        container.innerHTML = await response.text();

        return true;

    } catch (error) {
        console.error(
            "[COMPONENT] Loading error:",
            error
        );

        return false;
    }
}


// ============================================================
// Load Page Content
// Loads an HTML page and extracts only its body content.
// This prevents nested <html>, <head>, and <body> elements.
// ============================================================

async function loadPageContent(page, containerId = "page-content") {

    const container = document.getElementById(containerId);

    if (!container) {
        console.warn(
            `[PAGE] Container not found: #${containerId}`
        );

        return false;
    }

    try {

        const response = await fetch(
            `/pages/${page}.html`
        );

        if (!response.ok) {
            throw new Error(
                `Failed to load page: ${page}`
            );
        }

        const html = await response.text();

        // Parse the complete HTML document safely.
        const parser = new DOMParser();

        const documentObject = parser.parseFromString(
            html,
            "text/html"
        );

        // Use the body content only.
        const bodyContent = documentObject.body;

        if (!bodyContent) {
            throw new Error(
                `No body content found for page: ${page}`
            );
        }

        // Remove page-level script tags because
        // they do not execute when inserted through innerHTML.
        bodyContent
            .querySelectorAll("script")
            .forEach(script => script.remove());

        container.innerHTML = bodyContent.innerHTML;

        return true;

    } catch (error) {

        console.error(
            `[PAGE] Failed to load ${page}:`,
            error
        );

        container.innerHTML = `
            <div class="page-load-error">
                <h2>Unable to load page</h2>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;

        return false;
    }
}


// ============================================================
// Load Page CSS
// Dynamically loads the stylesheet belonging to a page.
// ============================================================

function loadPageStyles(page) {

    const styleId = "dynamic-page-style";

    // Remove the previous page stylesheet.
    const existingStyle = document.getElementById(styleId);

    if (existingStyle) {
        existingStyle.remove();
    }

    // Dashboard uses the global dashboard stylesheet.
    if (page === "dashboard") {

        const link = document.createElement("link");

        link.id = styleId;
        link.rel = "stylesheet";
        link.href = "/css/dashboard.css";

        document.head.appendChild(link);

        return;
    }

    // Returns uses its own stylesheet.
    if (page === "returns") {

        const link = document.createElement("link");

        link.id = styleId;
        link.rel = "stylesheet";
        link.href = "/css/returns.css";

        document.head.appendChild(link);

        return;
    }

    // Add other page styles here when needed.
}


// ============================================================
// Escape HTML
// Prevents error messages from injecting HTML.
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// Load Application Shell
// Loads all shared UI components.
// ============================================================

async function loadAppShell() {

    await Promise.all([

        loadComponent(
            "sidebar-container",
            "/components/sidebar/sidebar.html"
        ),

        loadComponent(
            "topbar-container",
            "/components/topbar/topbar.html"
        ),

        loadComponent(
            "modal-container",
            "/components/modal/modal.html"
        )

    ]);

}


// ============================================================
// Exports
// ============================================================

export {
    loadComponent,
    loadPageContent,
    loadPageStyles,
    loadAppShell
};