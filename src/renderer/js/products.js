// ============================================================
// ThreeMarket POS - Products Page
// Handles product loading, searching, product modal controls,
// and product creation workflow.
// ============================================================

import {
    loadTranslations,
    toggleLanguage
} from "./i18n.js";

import {
    loadAppShell
} from "./component-loader.js";

import {
    initializeNavigation
} from "./navigation.js";


// ============================================================
// Products State
// Stores all products loaded from the backend.
// ============================================================

let products = [];


// ============================================================
// Initialize Products Page
// Validates the session and initializes all page components.
// ============================================================

async function initializeProducts() {

    try {

        // ----------------------------------------------------
        // Validate the current authenticated session.
        // ----------------------------------------------------

        const session =
            await window.api.getSession();


        if (!session) {

            window.location.href = "/";

            return;

        }


        // ----------------------------------------------------
        // Load shared application components.
        // ----------------------------------------------------

        await loadAppShell();


        // ----------------------------------------------------
        // Load application translations.
        // ----------------------------------------------------

        await loadTranslations();


        // ----------------------------------------------------
        // Initialize application navigation.
        // ----------------------------------------------------

        initializeNavigation();


        // ----------------------------------------------------
        // Display current username.
        // ----------------------------------------------------

        const usernameElement =
            document.getElementById(
                "currentUsername"
            );


        if (usernameElement) {

            usernameElement.textContent =
                session.username;

        }


        // ----------------------------------------------------
        // Display current user role.
        // ----------------------------------------------------

        const roleElement =
            document.getElementById(
                "currentRole"
            );


        if (roleElement) {

            roleElement.textContent =
                session.role;

        }


        // ----------------------------------------------------
        // Initialize language button.
        // ----------------------------------------------------

        const languageButton =
            document.getElementById(
                "languageButton"
            );


        if (languageButton) {

            languageButton.addEventListener(
                "click",
                toggleLanguage
            );

        }


        // ----------------------------------------------------
        // Load products.
        // ----------------------------------------------------

        await loadProducts();


        // ----------------------------------------------------
        // Initialize product search.
        // ----------------------------------------------------

        initializeSearch();


        // ----------------------------------------------------
        // Initialize product modal.
        // ----------------------------------------------------

        initializeProductModal();


        console.log(
            "Products page initialized successfully."
        );

    } catch (error) {

        // ----------------------------------------------------
        // Handle unexpected initialization errors.
        // ----------------------------------------------------

        console.error(
            "Products initialization error:",
            error
        );

    }

}


// ============================================================
// Load Products
// Retrieves all products from the backend.
// ============================================================

async function loadProducts() {

    try {

        const result =
            await window.api.getProducts();


        // ----------------------------------------------------
        // Validate backend response.
        // ----------------------------------------------------

        if (Array.isArray(result)) {

            products = result;

        } else {

            products = [];

            console.warn(
                "Invalid products response:",
                result
            );

        }


        // ----------------------------------------------------
        // Render products.
        // ----------------------------------------------------

        renderProducts(products);


    } catch (error) {

        console.error(
            "Failed to load products:",
            error
        );

        products = [];

        renderProducts(products);

    }

}


// ============================================================
// Initialize Search
// Connects the product search input to the filtering logic.
// ============================================================

function initializeSearch() {

    const searchInput =
        document.getElementById(
            "productSearch"
        );


    if (!searchInput) {

        console.warn(
            "Product search input not found."
        );

        return;

    }


    searchInput.addEventListener(
        "input",
        handleSearch
    );

}


// ============================================================
// Handle Product Search
// Filters products by name, SKU, barcode, or category.
// ============================================================

function handleSearch(event) {

    const searchTerm =
        event.target.value
            .trim()
            .toLowerCase();


    // --------------------------------------------------------
    // Display all products when the search is empty.
    // --------------------------------------------------------

    if (!searchTerm) {

        renderProducts(products);

        return;

    }


    // --------------------------------------------------------
    // Filter products.
    // --------------------------------------------------------

    const filteredProducts =
        products.filter(
            (product) => {

                const name =
                    String(
                        product.name ?? ""
                    ).toLowerCase();


                const sku =
                    String(
                        product.sku ?? ""
                    ).toLowerCase();


                const barcode =
                    String(
                        product.barcode ?? ""
                    ).toLowerCase();


                const category =
                    String(
                        product.category ?? ""
                    ).toLowerCase();


                return (
                    name.includes(searchTerm) ||
                    sku.includes(searchTerm) ||
                    barcode.includes(searchTerm) ||
                    category.includes(searchTerm)
                );

            }
        );


    renderProducts(
        filteredProducts
    );

}


// ============================================================
// Render Products
// Renders the products table or the empty state.
// ============================================================

function renderProducts(productList) {

    const tableContainer =
        document.getElementById(
            "productsTableContainer"
        );


    const tableBody =
        document.getElementById(
            "productsTableBody"
        );


    const emptyState =
        document.getElementById(
            "productsEmptyState"
        );


    if (
        !tableContainer ||
        !tableBody ||
        !emptyState
    ) {

        console.warn(
            "Products UI elements were not found."
        );

        return;

    }


    // --------------------------------------------------------
    // Clear current table rows.
    // --------------------------------------------------------

    tableBody.innerHTML = "";


    // --------------------------------------------------------
    // Show empty state when no products exist.
    // --------------------------------------------------------

    if (!productList.length) {

        tableContainer.style.display =
            "none";


        emptyState.style.display =
            "flex";


        return;

    }


    // --------------------------------------------------------
    // Show products table.
    // --------------------------------------------------------

    tableContainer.style.display =
        "block";


    emptyState.style.display =
        "none";


    // --------------------------------------------------------
    // Create product rows.
    // --------------------------------------------------------

    productList.forEach(
        (product) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHtml(product.sku)}
                </td>

                <td>
                    ${escapeHtml(product.name)}
                </td>

                <td>
                    ${escapeHtml(product.category)}
                </td>

                <td>
                    ${Number(
                        product.price ?? 0
                    ).toFixed(2)}
                </td>

                <td>
                    ${Number(
                        product.quantity ?? 0
                    )}
                </td>

                <td>
                    ${
                        product.active !== false
                            ? "Active"
                            : "Inactive"
                    }
                </td>

                <td>

                    <button
                        type="button"
                        class="edit-product"
                        data-id="${product.id}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="delete-product"
                        data-id="${product.id}"
                    >
                        Delete
                    </button>

                </td>

            `;


            tableBody.appendChild(row);

        }
    );

}


// ============================================================
// Initialize Product Modal
// Connects all buttons and form controls to the modal.
// ============================================================

function initializeProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    const addProductButton =
        document.getElementById(
            "addProductButton"
        );


    const emptyAddProductButton =
        document.getElementById(
            "emptyAddProductButton"
        );


    const closeButton =
        document.getElementById(
            "closeProductModal"
        );


    const cancelButton =
        document.getElementById(
            "cancelProductButton"
        );


    const productForm =
        document.getElementById(
            "productForm"
        );


    if (!modal) {

        console.warn(
            "Product modal was not found."
        );

        return;

    }


    // --------------------------------------------------------
    // Open modal from page header button.
    // --------------------------------------------------------

    if (addProductButton) {

        addProductButton.addEventListener(
            "click",
            openProductModal
        );

    }


    // --------------------------------------------------------
    // Open modal from empty state button.
    // --------------------------------------------------------

    if (emptyAddProductButton) {

        emptyAddProductButton.addEventListener(
            "click",
            openProductModal
        );

    }


    // --------------------------------------------------------
    // Close modal using the X button.
    // --------------------------------------------------------

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeProductModal
        );

    }


    // --------------------------------------------------------
    // Close modal using Cancel.
    // --------------------------------------------------------

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeProductModal
        );

    }


    // --------------------------------------------------------
    // Close modal when clicking outside the modal content.
    // --------------------------------------------------------

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                closeProductModal();

            }

        }
    );


    // --------------------------------------------------------
    // Handle product form submission.
    // --------------------------------------------------------

    if (productForm) {

        productForm.addEventListener(
            "submit",
            handleProductSubmit
        );

    }

}


// ============================================================
// Open Product Modal
// Resets the form and displays the modal.
// ============================================================

function openProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    const form =
        document.getElementById(
            "productForm"
        );


    const errorElement =
        document.getElementById(
            "productFormError"
        );


    if (!modal) {

        return;

    }


    // --------------------------------------------------------
    // Reset form fields before creating a new product.
    // --------------------------------------------------------

    if (form) {

        form.reset();

    }


    // --------------------------------------------------------
    // Clear previous error message.
    // --------------------------------------------------------

    if (errorElement) {

        errorElement.textContent = "";

        errorElement.style.display =
            "none";

    }


    // --------------------------------------------------------
    // Make sure Active Product is enabled by default.
    // --------------------------------------------------------

    const activeCheckbox =
        document.getElementById(
            "productActive"
        );


    if (activeCheckbox) {

        activeCheckbox.checked =
            true;

    }


    // --------------------------------------------------------
    // Display modal.
    // --------------------------------------------------------

    modal.style.display =
        "flex";


    // --------------------------------------------------------
    // Focus the first field.
    // --------------------------------------------------------

    const nameInput =
        document.getElementById(
            "productName"
        );


    if (nameInput) {

        setTimeout(
            () => nameInput.focus(),
            50
        );

    }

}


// ============================================================
// Close Product Modal
// Hides the product modal.
// ============================================================

function closeProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (!modal) {

        return;

    }


    modal.style.display =
        "none";

}


// ============================================================
// Handle Product Form Submission
// Validates the form and sends product data to the backend.
// ============================================================

async function handleProductSubmit(event) {

    event.preventDefault();


    const errorElement =
        document.getElementById(
            "productFormError"
        );


    // --------------------------------------------------------
    // Read product form values.
    // --------------------------------------------------------

    const name =
        document.getElementById(
            "productName"
        )?.value.trim();


    const sku =
        document.getElementById(
            "productSku"
        )?.value.trim();


    const barcode =
        document.getElementById(
            "productBarcode"
        )?.value.trim();


    const category =
        document.getElementById(
            "productCategory"
        )?.value.trim();


    const price =
        Number(
            document.getElementById(
                "productPrice"
            )?.value
        );


    const quantity =
        Number(
            document.getElementById(
                "productQuantity"
            )?.value || 0
        );


    const minStock =
        Number(
            document.getElementById(
                "productMinStock"
            )?.value || 0
        );


    const active =
        document.getElementById(
            "productActive"
        )?.checked ?? true;


    // --------------------------------------------------------
    // Validate required product name.
    // --------------------------------------------------------

    if (!name) {

        showProductError(
            "Product name is required."
        );

        return;

    }


    // --------------------------------------------------------
    // Validate product price.
    // --------------------------------------------------------

    if (
        Number.isNaN(price) ||
        price < 0
    ) {

        showProductError(
            "Please enter a valid product price."
        );

        return;

    }


    // --------------------------------------------------------
    // Validate quantity.
    // --------------------------------------------------------

    if (
        Number.isNaN(quantity) ||
        quantity < 0
    ) {

        showProductError(
            "Please enter a valid quantity."
        );

        return;

    }


    // --------------------------------------------------------
    // Build product object.
    // --------------------------------------------------------

    const productData = {

        name,

        sku,

        barcode,

        category,

        price,

        quantity,

        minStock,

        active

    };


    // ============================================================
    // Save Product
    // Sends the product data to the Electron main process through
    // the secure preload API.
    // ============================================================

    try {

        const result =
            await window.api.createProduct(
                productData
            );


        // --------------------------------------------------------
        // Handle backend validation errors.
        // --------------------------------------------------------

        if (!result.success) {

            showProductError(
                result.message ||
                "Failed to create product."
            );

            return;

        }


        // --------------------------------------------------------
        // Add the newly created product to the local state.
        // --------------------------------------------------------

        products.push(
            result.product
        );


        // --------------------------------------------------------
        // Refresh the products table.
        // --------------------------------------------------------

        renderProducts(
            products
        );


        // --------------------------------------------------------
        // Close the modal after successful creation.
        // --------------------------------------------------------

        closeProductModal();


        // --------------------------------------------------------
        // Clear the search field so the new product is visible.
        // --------------------------------------------------------

        const searchInput =
            document.getElementById(
                "productSearch"
            );


        if (searchInput) {

            searchInput.value = "";

        }


        console.log(
            "Product created successfully:",
            result.product
        );

    } catch (error) {

        // --------------------------------------------------------
        // Handle unexpected product creation errors.
        // --------------------------------------------------------

        console.error(
            "Create product error:",
            error
        );

        showProductError(
            "An unexpected error occurred while creating the product."
        );

    }

}


// ============================================================
// Show Product Form Error
// Displays a validation error inside the modal.
// ============================================================

function showProductError(message) {

    const errorElement =
        document.getElementById(
            "productFormError"
        );


    if (!errorElement) {

        return;

    }


    errorElement.textContent =
        message;


    errorElement.style.display =
        "block";


    errorElement.style.background =
        "#fee2e2";


    errorElement.style.color =
        "#991b1b";

}


// ============================================================
// Escape HTML
// Prevents product values from being interpreted as HTML.
// ============================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// Products Page Entry Point
// Starts initialization after the DOM is ready.
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeProducts
);