// ============================================================
// ThreeMarket POS - Internationalization
// Handles English/Arabic translations, language switching,
// text translation, input placeholders, and RTL/LTR layout.
// ============================================================


// ============================================================
// Translation Dictionary
// Contains all application translations for supported languages.
// ============================================================

const translations = {

    // ========================================================
    // English
    // ========================================================

    en: {

        // ----------------------------------------------------
        // Login
        // ----------------------------------------------------

        login: {
            subtitle: "Retail Management System",
            username: "Username",
            password: "Password",
            button: "Login"
        },


        // ----------------------------------------------------
        // Navigation
        // ----------------------------------------------------

        nav: {
            dashboard: "Dashboard",
            sales: "Sales",
            products: "Products",
            inventory: "Inventory",
            customers: "Customers",
            suppliers: "Suppliers",
            reports: "Reports",
            settings: "Settings",
            logout: "Logout"
        },


        // ----------------------------------------------------
        // Dashboard
        // ----------------------------------------------------

        dashboard: {
            title: "Dashboard",
            welcome: "Welcome to ThreeMarket POS",

            sales: "Today's Sales",

            transactions: "Transactions",

            products: "Products",

            lowStock: "Low Stock",

            ready:
                "Ready to manage your business?",

            description:
                "ThreeMarket POS provides a unified retail management platform for different types of businesses."
        },


        // ----------------------------------------------------
        // Products
        // ----------------------------------------------------

        products: {

            title: "Products",

            subtitle:
                "Manage your products",

            add:
                "Add Product",

            search:
                "Search products...",

            sku:
                "SKU",

            name:
                "Product",

            category:
                "Category",

            price:
                "Price",

            stock:
                "Stock",

            status:
                "Status",

            actions:
                "Actions",

            empty:
                "No products found",

            emptyDescription:
                "Add your first product to get started.",


            // ------------------------------------------------
            // Product Modal
            // ------------------------------------------------

            modal: {

                title:
                    "Add Product",

                subtitle:
                    "Add a new product to your inventory"

            },


            // ------------------------------------------------
            // Product Form
            // ------------------------------------------------

            form: {

                name:
                    "Product Name",

                sku:
                    "SKU",

                barcode:
                    "Barcode",

                category:
                    "Category",

                price:
                    "Price",

                quantity:
                    "Quantity",

                minStock:
                    "Minimum Stock",

                active:
                    "Active Product"

            }

        },


        // ----------------------------------------------------
        // Common UI
        // Shared labels used throughout the application.
        // ----------------------------------------------------

        common: {

            cancel:
                "Cancel",

            save:
                "Save Product",

            edit:
                "Edit",

            delete:
                "Delete",

            close:
                "Close",

            confirm:
                "Confirm",

            yes:
                "Yes",

            no:
                "No",

            search:
                "Search",

            loading:
                "Loading...",

            error:
                "An error occurred.",

            success:
                "Operation completed successfully."

        }

    },


    // ========================================================
    // Arabic
    // ========================================================

    ar: {

        // ----------------------------------------------------
        // Login
        // ----------------------------------------------------

        login: {

            subtitle:
                "نظام إدارة التجزئة",

            username:
                "اسم المستخدم",

            password:
                "كلمة المرور",

            button:
                "تسجيل الدخول"

        },


        // ----------------------------------------------------
        // Navigation
        // ----------------------------------------------------

        nav: {

            dashboard:
                "لوحة التحكم",

            sales:
                "المبيعات",

            products:
                "المنتجات",

            inventory:
                "المخزون",

            customers:
                "العملاء",

            suppliers:
                "الموردون",

            reports:
                "التقارير",

            settings:
                "الإعدادات",

            logout:
                "تسجيل الخروج"

        },


        // ----------------------------------------------------
        // Dashboard
        // ----------------------------------------------------

        dashboard: {

            title:
                "لوحة التحكم",

            welcome:
                "مرحباً بك في ThreeMarket POS",

            sales:
                "مبيعات اليوم",

            transactions:
                "المعاملات",

            products:
                "المنتجات",

            lowStock:
                "مخزون منخفض",

            ready:
                "جاهز لإدارة أعمالك؟",

            description:
                "يوفر ThreeMarket POS منصة موحدة لإدارة التجزئة لمختلف أنواع الأنشطة التجارية."

        },


        // ----------------------------------------------------
        // Products
        // ----------------------------------------------------

        products: {

            title:
                "المنتجات",

            subtitle:
                "إدارة المنتجات",

            add:
                "إضافة منتج",

            search:
                "البحث عن المنتجات...",

            sku:
                "رمز المنتج",

            name:
                "المنتج",

            category:
                "الفئة",

            price:
                "السعر",

            stock:
                "المخزون",

            status:
                "الحالة",

            actions:
                "الإجراءات",

            empty:
                "لا توجد منتجات",

            emptyDescription:
                "أضف أول منتج للبدء.",


            // ------------------------------------------------
            // Product Modal
            // ------------------------------------------------

            modal: {

                title:
                    "إضافة منتج",

                subtitle:
                    "إضافة منتج جديد إلى المخزون"

            },


            // ------------------------------------------------
            // Product Form
            // ------------------------------------------------

            form: {

                name:
                    "اسم المنتج",

                sku:
                    "رمز المنتج",

                barcode:
                    "الباركود",

                category:
                    "الفئة",

                price:
                    "السعر",

                quantity:
                    "الكمية",

                minStock:
                    "الحد الأدنى للمخزون",

                active:
                    "منتج نشط"

            }

        },


        // ----------------------------------------------------
        // Common UI
        // ----------------------------------------------------

        common: {

            cancel:
                "إلغاء",

            save:
                "حفظ المنتج",

            edit:
                "تعديل",

            delete:
                "حذف",

            close:
                "إغلاق",

            confirm:
                "تأكيد",

            yes:
                "نعم",

            no:
                "لا",

            search:
                "بحث",

            loading:
                "جاري التحميل...",

            error:
                "حدث خطأ.",

            success:
                "تمت العملية بنجاح."

        }

    }

};


// ============================================================
// Current Language
// Stores the language currently active in the application.
// ============================================================

let currentLanguage = "en";


// ============================================================
// Get Translation
// Retrieves a translation using a dot-separated key.
// Example:
// getTranslation("products.title")
// ============================================================

function getTranslation(key) {

    const keys =
        key.split(".");


    let value =
        translations[currentLanguage];


    for (const item of keys) {

        value =
            value?.[item];

    }


    return value || key;

}


// ============================================================
// Apply Language
// Updates translated text, placeholders, page direction,
// document language, and the language button.
// ============================================================

function applyLanguage() {

    // --------------------------------------------------------
    // Update HTML language attribute.
    // --------------------------------------------------------

    document.documentElement.lang =
        currentLanguage;


    // --------------------------------------------------------
    // Update page direction.
    // Arabic = RTL
    // English = LTR
    // --------------------------------------------------------

    document.documentElement.dir =
        currentLanguage === "ar"
            ? "rtl"
            : "ltr";


    // --------------------------------------------------------
    // Translate normal text elements.
    // Example:
    // <span data-i18n="products.title"></span>
    // --------------------------------------------------------

    document
        .querySelectorAll(
            "[data-i18n]"
        )
        .forEach(
            (element) => {

                const key =
                    element.dataset.i18n;


                element.textContent =
                    getTranslation(key);

            }
        );


    // --------------------------------------------------------
    // Translate input placeholders.
    // Example:
    // data-i18n-placeholder="products.search"
    // --------------------------------------------------------

    document
        .querySelectorAll(
            "[data-i18n-placeholder]"
        )
        .forEach(
            (element) => {

                const key =
                    element.dataset
                        .i18nPlaceholder;


                element.placeholder =
                    getTranslation(key);

            }
        );


    // --------------------------------------------------------
    // Update language button.
    // --------------------------------------------------------

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


// ============================================================
// Load Translations
// Applies the current language to the loaded page.
// This is asynchronous so translation loading can later be
// extended to external JSON files if needed.
// ============================================================

async function loadTranslations() {

    applyLanguage();

}


// ============================================================
// Toggle Language
// Switches between English and Arabic and immediately
// updates the current page.
// ============================================================

function toggleLanguage() {

    currentLanguage =
        currentLanguage === "en"
            ? "ar"
            : "en";


    applyLanguage();

}


// ============================================================
// Get Current Language
// Returns the language currently selected by the user.
// ============================================================

function getCurrentLanguage() {

    return currentLanguage;

}


// ============================================================
// Export Internationalization Functions
// Makes the translation functions available to other
// renderer modules.
// ============================================================

export {

    loadTranslations,

    applyLanguage,

    toggleLanguage,

    getTranslation,

    getCurrentLanguage

};