// ============================================================
// ThreeMarket POS - Sales History
// Handles loading, filtering, rendering and viewing sales.
// ============================================================

let allSales = [];
let allReturns = [];

let historyInitialized = false;


// ============================================================
// Load Data
// ============================================================

async function loadHistory() {

    try {

        allSales = await window.api.getAllSales() || [];

        allReturns = await window.api.getAllReturns() || [];


        // Sort newest sales first.

        allSales.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );


        render();

    } catch (error) {

        console.error(
            "[SalesHistory] Load failed:",
            error
        );

        const body =
            document.getElementById("salesBody");

        if (body) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="history-empty"
                    >
                        Failed to load sales history.
                    </td>
                </tr>
            `;

        }

    }

}


// ============================================================
// Filters
// ============================================================

function applyFilters() {

    const from =
        document.getElementById("dateFrom")?.value || "";

    const to =
        document.getElementById("dateTo")?.value || "";

    const term =
        document
            .getElementById("searchInput")
            ?.value
            .trim()
            .toLowerCase() || "";


    const fromDate =
        from
            ? new Date(`${from}T00:00:00`)
            : null;


    const toDate =
        to
            ? new Date(`${to}T23:59:59.999`)
            : null;


    return allSales.filter(sale => {

        const saleDate =
            new Date(sale.createdAt);


        if (
            fromDate &&
            saleDate < fromDate
        ) {

            return false;

        }


        if (
            toDate &&
            saleDate > toDate
        ) {

            return false;

        }


        if (term) {

            const invoice =
                String(
                    sale.invoiceLabel ?? ""
                ).toLowerCase();


            if (!invoice.includes(term)) {

                return false;

            }

        }


        return true;

    });

}


// ============================================================
// Returned Information
// ============================================================

function returnedInfoFor(sale) {

    const returns =
        allReturns.filter(
            r =>
                r.saleId === sale.id &&
                r.status !== "cancelled"
        );


    if (!returns.length) {

        return {

            text: "—",

            cls: ""

        };

    }


    const totalReturned =
        returns.reduce(
            (sum, r) =>
                sum + Number(r.total || 0),
            0
        );


    return {

        text:
            `${returns.length} return(s) • ${totalReturned.toFixed(2)}`,

        cls: "has-return"

    };

}


// ============================================================
// Payment Display
// ============================================================

function paymentText(method, payments) {

    if (
        method === "split" &&
        Array.isArray(payments)
    ) {

        return payments

            .map(p => {

                const label =
                    paymentMethodLabel(p.method);

                const amount =
                    Number(p.amount || 0)
                        .toFixed(2);

                return `${label}: ${amount}`;

            })

            .join(" + ");

    }


    return paymentMethodLabel(method);

}


// ============================================================
// Payment Method Label
// ============================================================

function paymentMethodLabel(method) {

    const labels = {

        cash: "Cash 💵",

        card: "Card 💳",

        other: "Other"

    };


    return labels[method] ?? method ?? "—";

}


// ============================================================
// HTML Escape
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
// Summary
// ============================================================

function renderSummary(filteredSales) {

    const activeSales =
        filteredSales.filter(
            sale => !sale.voided
        );


    const totalSales =
        activeSales.reduce(
            (sum, sale) =>
                sum + Number(sale.total || 0),
            0
        );


    const visibleSaleIds =
        new Set(
            filteredSales.map(
                sale => sale.id
            )
        );


    const returnedTotal =
        allReturns

            .filter(returnRecord =>

                returnRecord.status !== "cancelled" &&

                visibleSaleIds.has(
                    returnRecord.saleId
                )

            )

            .reduce(
                (sum, returnRecord) =>
                    sum +
                    Number(
                        returnRecord.total || 0
                    ),
                0
            );


    const sumCount =
        document.getElementById("sumCount");

    const sumTotal =
        document.getElementById("sumTotal");

    const sumReturned =
        document.getElementById("sumReturned");


    if (sumCount) {

        sumCount.textContent =
            filteredSales.length;

    }


    if (sumTotal) {

        sumTotal.textContent =
            totalSales.toFixed(2);

    }


    if (sumReturned) {

        sumReturned.textContent =
            returnedTotal.toFixed(2);

    }

}


// ============================================================
// Render Table
// ============================================================

function render() {

    const filtered =
        applyFilters();


    const salesCount =
        document.getElementById("salesCount");


    if (salesCount) {

        salesCount.textContent =
            `${filtered.length} invoice(s)`;

    }


    const body =
        document.getElementById("salesBody");


    if (!body) {

        return;

    }


    body.innerHTML = "";


    if (!filtered.length) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="history-empty"
                >
                    No invoices found.
                </td>

            </tr>

        `;

        renderSummary(filtered);

        return;

    }


    for (const sale of filtered) {

        const ret =
            returnedInfoFor(sale);


        const row =
            document.createElement("tr");


        const invoiceLabel =
            escapeHtml(
                sale.invoiceLabel
            );


        const createdAt =
            sale.createdAt
                ? new Date(
                    sale.createdAt
                ).toLocaleString()
                : "—";


        const itemsCount =
            Array.isArray(sale.items)
                ? sale.items.length
                : 0;


        const subtotal =
            Number(
                sale.subtotal || 0
            ).toFixed(2);


        const vat =
            Number(
                sale.vatAmount ??
                sale.tax ??
                0
            ).toFixed(2);


        const total =
            Number(
                sale.total || 0
            ).toFixed(2);


        const payment =
            escapeHtml(
                paymentText(
                    sale.paymentMethod,
                    sale.payments
                )
            );


        let returnStatus;


        if (sale.voided) {

            const voidedBy =
                escapeHtml(
                    sale.voidedBy ?? "-"
                );


            returnStatus = `

                <span class="voided-sale">

                    ❌ Voided (${voidedBy})

                </span>

            `;

        } else {

            returnStatus = ret.text;

        }


        const actionButton =
            !sale.voided

                ? `

                    <button
                        type="button"
                        class="btn btn-secondary view-invoice-btn"
                        data-sale-id="${escapeHtml(sale.id)}"
                    >
                        View
                    </button>

                `

                : "";


        row.innerHTML = `

            <td>
                ${invoiceLabel}
            </td>

            <td>
                ${createdAt}
            </td>

            <td>
                ${payment}
            </td>

            <td>
                ${itemsCount}
            </td>

            <td>
                ${subtotal}
            </td>

            <td>
                ${vat}
            </td>

            <td>
                <strong>
                    ${total}
                </strong>
            </td>

            <td class="${ret.cls}">
                ${returnStatus}
            </td>

            <td>
                ${actionButton}
            </td>

        `;


        body.appendChild(row);

    }


    // Attach View buttons after rendering.

    body
        .querySelectorAll(".view-invoice-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const saleId =
                        button.dataset.saleId;

                    viewInvoice(saleId);

                }
            );

        });


    renderSummary(filtered);

}


// ============================================================
// View Invoice Details
// ============================================================

function viewInvoice(saleId) {

    const sale =
        allSales.find(
            item => item.id === saleId
        );


    if (!sale) {

        return;

    }


    let details =

        `Invoice: ${sale.invoiceLabel}\n` +

        `Cashier: ${sale.username ?? "-"}\n\n` +

        `Items:\n`;


    for (const item of sale.items || []) {

        details +=

            `• ${item.name} × ${item.qty} @ ` +

            `${Number(item.price || 0).toFixed(2)}\n`;

    }


    details +=

        `\n` +

        `Subtotal: ` +

        `${Number(
            sale.subtotal || 0
        ).toFixed(2)}\n` +


        `Discount: ` +

        `${Number(
            sale.discount || 0
        ).toFixed(2)}\n` +


        `VAT: ` +

        `${Number(
            sale.vatAmount ??
            sale.tax ??
            0
        ).toFixed(2)}` +


        ` (${sale.vatEnabled
            ? `${sale.vatRate}%`
            : "disabled"})\n` +


        `TOTAL: ` +

        `${Number(
            sale.total || 0
        ).toFixed(2)}`;


    alert(details);

}


// ============================================================
// Initialize Sales History
// This function is called by main.js Router.
// ============================================================

export async function initSalesHistory() {

    console.log(
        "[SalesHistory] Initializing..."
    );


    // Reset page-level state.

    allSales = [];

    allReturns = [];


    // Load sales and returns.

    await loadHistory();


    // Prevent duplicate event handlers
    // if the page is initialized more than once.

    if (!historyInitialized) {

        const applyButton =
            document.getElementById(
                "applyFiltersBtn"
            );


        const clearButton =
            document.getElementById(
                "clearFiltersBtn"
            );


        const searchInput =
            document.getElementById(
                "searchInput"
            );


        applyButton?.addEventListener(
            "click",
            render
        );


        clearButton?.addEventListener(
            "click",
            () => {

                const dateFrom =
                    document.getElementById(
                        "dateFrom"
                    );

                const dateTo =
                    document.getElementById(
                        "dateTo"
                    );


                if (dateFrom) {

                    dateFrom.value = "";

                }


                if (dateTo) {

                    dateTo.value = "";

                }


                if (searchInput) {

                    searchInput.value = "";

                }


                render();

            }
        );


        searchInput?.addEventListener(
            "input",
            render
        );


        historyInitialized = true;

    }


    console.log(
        "[SalesHistory] Initialized successfully."
    );

}