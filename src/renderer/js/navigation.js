const pages = {
    dashboard: "/pages/dashboard.html",
    sales: "/pages/sales.html",
    products: "/pages/products.html",
    inventory: "/pages/inventory.html",
    customers: "/pages/customers.html",
    suppliers: "/pages/suppliers.html",
    reports: "/pages/reports.html",
    settings: "/pages/settings.html"
};


function navigateTo(page) {

    const target = pages[page];

    if (!target) {
        console.error(`Unknown page: ${page}`);
        return;
    }

    window.location.href = target;
}


function setActiveNavigation() {

    const currentPath =
        window.location.pathname;

    const navItems =
        document.querySelectorAll("[data-page]");

    navItems.forEach((item) => {

        const page =
            item.dataset.page;

        const target =
            pages[page];

        item.classList.toggle(
            "active",
            currentPath === target
        );

    });
}


function initializeNavigation() {

    const navItems =
        document.querySelectorAll("[data-page]");


    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            () => {

                const page =
                    item.dataset.page;

                navigateTo(page);

            }
        );

    });


    setActiveNavigation();
}


export {
    navigateTo,
    initializeNavigation,
    setActiveNavigation
};