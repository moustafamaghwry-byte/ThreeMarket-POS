// ============================================================
// ThreeMarket POS - Product Service
// Handles product business operations between the renderer
// process and the product repository.
// ============================================================

const productRepository =
    require("../repositories/product.repository");


// ============================================================
// Get All Products
// Returns all products from the repository.
// ============================================================

function getAllProducts() {

    return productRepository.getAll();

}


// ============================================================
// Create Product
// Validates the product data and creates a new product.
// ============================================================

function createProduct(productData) {

    // --------------------------------------------------------
    // Validate product data.
    // --------------------------------------------------------

    if (!productData) {

        return {
            success: false,
            message: "Product data is required."
        };

    }


    // --------------------------------------------------------
    // Validate product name.
    // --------------------------------------------------------

    if (
        !productData.name ||
        !String(productData.name).trim()
    ) {

        return {
            success: false,
            message: "Product name is required."
        };

    }


    // --------------------------------------------------------
    // Validate product price.
    // --------------------------------------------------------

    const price =
        Number(productData.price);


    if (
        Number.isNaN(price) ||
        price < 0
    ) {

        return {
            success: false,
            message: "Invalid product price."
        };

    }


    // --------------------------------------------------------
    // Validate quantity.
    // --------------------------------------------------------

    const quantity =
        Number(productData.quantity ?? 0);


    if (
        Number.isNaN(quantity) ||
        quantity < 0
    ) {

        return {
            success: false,
            message: "Invalid product quantity."
        };

    }


    // --------------------------------------------------------
    // Check SKU uniqueness when provided.
    // --------------------------------------------------------

    if (productData.sku) {

        const existingProduct =
            productRepository.getBySku(
                productData.sku
            );


        if (existingProduct) {

            return {
                success: false,
                message: "SKU already exists."
            };

        }

    }


    // --------------------------------------------------------
    // Check barcode uniqueness when provided.
    // --------------------------------------------------------

    if (productData.barcode) {

        const existingProduct =
            productRepository.getByBarcode(
                productData.barcode
            );


        if (existingProduct) {

            return {
                success: false,
                message: "Barcode already exists."
            };

        }

    }


    // --------------------------------------------------------
    // Create the product through the repository.
    // --------------------------------------------------------

    const product =
        productRepository.create({

            ...productData,

            name:
                String(
                    productData.name
                ).trim(),

            price,

            quantity

        });


    // --------------------------------------------------------
    // Return the created product.
    // --------------------------------------------------------

    return {
        success: true,
        product
    };

}


// ============================================================
// Product Service API
// Exports product operations used by Electron IPC handlers.
// ============================================================

module.exports = {

    getAllProducts,

    createProduct

};