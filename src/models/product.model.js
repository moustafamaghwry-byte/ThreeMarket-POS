class Product {
    constructor({
        id = null,
        sku = "",
        barcode = "",
        name = "",
        category = "",
        price = 0,
        cost = 0,
        quantity = 0,
        minStock = 0,
        unit = "pcs",
        active = true
    } = {}) {

        this.id = id;
        this.sku = sku;
        this.barcode = barcode;
        this.name = name;
        this.category = category;

        this.price = Number(price) || 0;
        this.cost = Number(cost) || 0;

        this.quantity = Number(quantity) || 0;
        this.minStock = Number(minStock) || 0;

        this.unit = unit;
        this.active = active;
    }


    isLowStock() {
        return this.quantity <= this.minStock;
    }


    getStockValue() {
        return this.quantity * this.cost;
    }


    getSellingValue() {
        return this.quantity * this.price;
    }
}


module.exports = Product;