const Product = require("../models/product.model");

class ProductRepository {

    constructor() {
        this.products = [];
        this.nextId = 1;
    }


    getAll() {
        return [...this.products];
    }


    getActive() {
        return this.products.filter(
            product => product.active
        );
    }


    getById(id) {
        return this.products.find(
            product => product.id === Number(id)
        ) || null;
    }


    getBySku(sku) {
        return this.products.find(
            product => product.sku === sku
        ) || null;
    }


    getByBarcode(barcode) {
        return this.products.find(
            product => product.barcode === barcode
        ) || null;
    }


    create(productData) {

        const product =
            new Product({
                ...productData,
                id: this.nextId++
            });

        this.products.push(product);

        return product;
    }


    update(id, productData) {

        const product =
            this.getById(id);

        if (!product) {
            return null;
        }

        Object.assign(
            product,
            productData
        );

        return product;
    }


    delete(id) {

        const index =
            this.products.findIndex(
                product =>
                    product.id === Number(id)
            );

        if (index === -1) {
            return false;
        }

        this.products.splice(index, 1);

        return true;
    }


    search(searchTerm) {

        const term =
            String(searchTerm)
                .trim()
                .toLowerCase();

        if (!term) {
            return this.getAll();
        }

        return this.products.filter(
            product =>
                product.name
                    .toLowerCase()
                    .includes(term) ||

                product.sku
                    .toLowerCase()
                    .includes(term) ||

                product.barcode
                    .toLowerCase()
                    .includes(term) ||

                product.category
                    .toLowerCase()
                    .includes(term)
        );
    }


    getLowStock() {

        return this.products.filter(
            product =>
                product.active &&
                product.isLowStock()
        );
    }


    count() {
        return this.products.length;
    }


    clear() {
        this.products = [];
        this.nextId = 1;
    }
}


module.exports = new ProductRepository();