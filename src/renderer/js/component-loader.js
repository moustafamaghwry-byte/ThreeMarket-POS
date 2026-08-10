async function loadComponent(containerId, componentPath) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.warn(`Container not found: #${containerId}`);
        return;
    }

    try {
        const response = await fetch(componentPath);

        if (!response.ok) {
            throw new Error(
                `Failed to load component: ${componentPath}`
            );
        }

        container.innerHTML = await response.text();

    } catch (error) {
        console.error(
            "Component loading error:",
            error
        );
    }
}

// ============================================================
// Load Application Shell
// Loads all shared UI components used across application pages.
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

export {
    loadComponent,
    loadAppShell
};