// ============================================================
// ThreeMarket POS - Returns Page
// Handles invoice search, partial/full returns,
// VAT calculation, validation, return processing,
// receipt preview, and receipt printing.
// ============================================================

let currentSale = null;
let vatEnabled = false;
let vatRate = 0;


// ============================================================
// DOM Helper
// Provides a short and safe way to access elements.
// ============================================================

function $(id) {
    return document.getElementById(id);
}


// ============================================================
// Format Money
// Keeps all monetary values consistent.
// ============================================================

function formatMoney(value) {
    return Number(value || 0).toFixed(2);
}


// ============================================================
// Show Message
// Displays a page-level message.
// ============================================================

function showMessage(message, type = "success") {
    const element = $("message");
    if (!element) return;

    element.textContent = message;
    element.className = `returns-message ${type}`;
    element.hidden = false;
    element.style.display = "block";
}


// ============================================================
// Hide Message
// Hides the page-level message.
// ============================================================

function hideMessage() {
    const element = $("message");
    if (!element) return;

    element.hidden = true;
    element.style.display = "none";
    element.textContent = "";
    element.className = "returns-message";
}


// ============================================================
// Load VAT Settings
// Reads VAT configuration from the application settings.
// ============================================================

async function loadVatSettings() {
    try {
        const result = await window.api.getTaxSettings();

        console.log("[Returns] VAT settings:", result);

        if (result && result.success && result.settings) {
            vatEnabled = Boolean(result.settings.vatEnabled);
            vatRate = Number(result.settings.vatRate) || 0;
        } else {
            vatEnabled = false;
            vatRate = 0;
        }
    } catch (error) {
        console.error(
            "[Returns] Failed to load VAT settings:",
            error
        );

        vatEnabled = false;
        vatRate = 0;
    }

    updateVatStatus();
}


// ============================================================
// Update VAT Status
// Shows the active VAT configuration.
// ============================================================

function updateVatStatus() {
    const element = $("vatStatus");
    if (!element) return;

    if (vatEnabled && vatRate > 0) {
        element.textContent = `VAT ${vatRate}%`;
    } else {
        element.textContent = "VAT OFF";
    }
}


// ============================================================
// Search Invoice
// Loads a sale from the Electron API.
// ============================================================

async function searchInvoice() {
    hideMessage();

    const input = $("invoiceSearch");
    const invoice = input?.value?.trim();

    if (!invoice) {
        showMessage(
            "Please enter an invoice number.",
            "error"
        );

        input?.focus();
        return;
    }

    const searchBtn = $("searchInvoiceBtn");

    try {
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = "Searching...";
        }

        const result =
            await window.api.getSaleForReturn(invoice);

        console.log(
            "[Returns] Invoice search:",
            result
        );

        if (!result || result.success === false) {
            showMessage(
                result?.message || "Invoice not found.",
                "error"
            );

            clearSale();
            return;
        }

        const sale = result.sale || result;

        if (!sale) {
            showMessage(
                "Invoice not found.",
                "error"
            );

            clearSale();
            return;
        }

        currentSale = sale;

        if (result.fullyReturned) {
            renderSale();
            renderFullyReturnedState();

            showMessage(
                "This invoice has been fully returned.",
                "warning"
            );

            return;
        }

        renderSale();

        showMessage(
            "Invoice loaded successfully.",
            "success"
        );

    } catch (error) {
        console.error(
            "[Returns] Search error:",
            error
        );

        showMessage(
            "Failed to search invoice.",
            "error"
        );

    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = "Search";
        }
    }
}


// ============================================================
// Render Fully Returned State
// Shows a dedicated state when the invoice has no returnable items.
// ============================================================

function renderFullyReturnedState() {
    const container = $("returnItems");

    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✓</div>
                <strong>Fully Returned</strong>
                <span>
                    This invoice has been fully returned.
                    No items are available for another return.
                </span>
            </div>
        `;
    }

    const summary = $("returnSummary");

    if (summary) {
        summary.hidden = true;
        summary.style.display = "none";
    }

    const submitBtn = $("submitReturnBtn");

    if (submitBtn) {
        submitBtn.disabled = true;
    }

    const fullBtn = $("fullReturnBtn");

    if (fullBtn) {
        fullBtn.disabled = true;
    }

    const clearBtn = $("clearReturnBtn");

    if (clearBtn) {
        clearBtn.disabled = true;
    }
}


// ============================================================
// Render Sale
// Displays invoice information and products.
// ============================================================

function renderSale() {
    if (!currentSale) return;

    const saleInfo = $("saleInfo");

    if (saleInfo) {
        saleInfo.hidden = false;
        saleInfo.style.display = "block";
    }

    $("invoiceLabel").textContent =
        currentSale.invoiceLabel ||
        formatInvoiceNumber(
            currentSale.invoiceNumber
        );

    $("saleDate").textContent =
        formatDate(
            currentSale.createdAt ||
            currentSale.date
        );

    $("paymentMethod").textContent =
        formatPaymentMethod(
            currentSale.paymentMethod
        );

    $("saleTotal").textContent =
        formatMoney(
            getSaleTotal()
        );

    const fullBtn = $("fullReturnBtn");
    const clearBtn = $("clearReturnBtn");
    const submitBtn = $("submitReturnBtn");

    if (fullBtn) {
        fullBtn.disabled = false;
    }

    if (clearBtn) {
        clearBtn.disabled = false;
    }

    if (submitBtn) {
        submitBtn.disabled = false;
    }

    renderItems();
    calculateReturn();
}


// ============================================================
// Get Sale Total
// Uses the stored sale total when available.
// ============================================================

function getSaleTotal() {
    if (!currentSale) return 0;

    const storedTotal =
        Number(currentSale.total);

    if (
        Number.isFinite(storedTotal) &&
        storedTotal > 0
    ) {
        return storedTotal;
    }

    return getSaleItems().reduce(
        (total, item) => {
            const qty =
                Number(item.qty) || 0;

            const price =
                Number(item.price) || 0;

            return total + qty * price;
        },
        0
    );
}


// ============================================================
// Format Invoice Number
// Supports numeric invoice numbers.
// ============================================================

function formatInvoiceNumber(number) {
    if (!number) return "-";

    const value = String(number);

    if (
        value
            .toUpperCase()
            .startsWith("INV-")
    ) {
        return value;
    }

    return `INV-${value.padStart(6, "0")}`;
}


// ============================================================
// Format Date
// Converts stored date into a readable local date/time.
// ============================================================

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString();
}


// ============================================================
// Format Payment Method
// Converts internal payment values to display labels.
// ============================================================

function formatPaymentMethod(method) {
    switch (
        String(method || "").toLowerCase()
    ) {
        case "cash":
            return "Cash";

        case "card":
            return "Card";

        case "other":
            return "Other";

        case "split":
            return "Split Payment";

        default:
            return method || "-";
    }
}


// ============================================================
// Get Sale Items
// Returns the products belonging to the current sale.
// ============================================================

function getSaleItems() {
    if (
        !currentSale ||
        !Array.isArray(currentSale.items)
    ) {
        return [];
    }

    return currentSale.items;
}


// ============================================================
// Get Item Available For Return
// Falls back to sold qty when the field is missing.
// ============================================================

function getItemAvailable(item) {
    if (!item) return 0;

    if (
        item.availableForReturn !== undefined
    ) {
        return (
            Number(
                item.availableForReturn
            ) || 0
        );
    }

    return Number(item.qty) || 0;
}


// ============================================================
// Render Items
// Creates product rows and return quantity controls.
// ============================================================

function renderItems() {
    const container = $("returnItems");

    if (!container) return;

    container.innerHTML = "";

    const items = getSaleItems();

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">↩</div>
                <strong>No products found</strong>
                <span>
                    This invoice contains no returnable products.
                </span>
            </div>
        `;

        return;
    }

    items.forEach((item, index) => {
        const soldQty =
            Number(item.qty) || 0;

        const available =
            getItemAvailable(item);

        const price =
            Number(item.price) || 0;

        const alreadyReturned =
            Number(item.alreadyReturned) || 0;

        const returnedNote =
            alreadyReturned > 0
                ? `
                    <small class="item-returned-note">
                        Already returned:
                        ${alreadyReturned}
                    </small>
                `
                : "";

        const row =
            document.createElement("div");

        row.className = "return-item";
        row.dataset.index = index;

        row.innerHTML = `
            <div class="item-info">

                <strong>
                    ${escapeHtml(
                        item.name || "Product"
                    )}
                </strong>

                <span>
                    SKU:
                    ${escapeHtml(
                        item.sku || "-"
                    )}
                </span>

                ${returnedNote}

            </div>

            <div class="item-price">
                ${formatMoney(price)}
            </div>

            <div class="item-available">
                Qty: ${soldQty}
            </div>

            <div class="item-quantity">

                <label>
                    Return Qty
                </label>

                <input
                    type="number"
                    class="return-qty"
                    min="0"
                    max="${available}"
                    step="1"
                    value="0"
                    inputmode="numeric"
                    data-index="${index}"
                    aria-label="Return quantity"
                >

            </div>

            <div class="item-total">
                0.00
            </div>
        `;

        container.appendChild(row);
    });

    container
        .querySelectorAll(".return-qty")
        .forEach(input => {

            input.addEventListener(
                "input",
                () => {

                    validateQuantityInput(
                        input
                    );

                    calculateReturn();
                }
            );
        });
}


// ============================================================
// Validate Quantity
// Prevents invalid or excessive return quantities.
// ============================================================

function validateQuantityInput(input) {
    const max =
        Number(input.max) || 0;

    let value =
        Number(input.value);

    if (!Number.isFinite(value)) {
        value = 0;
    }

    value = Math.floor(value);

    value = Math.max(
        0,
        Math.min(value, max)
    );

    input.value = value;
}


// ============================================================
// Get Selected Return Items
// Builds the return payload from selected quantities.
// Returns null when validation fails.
// ============================================================

function getSelectedReturnItems() {
    if (!currentSale) return [];

    const items =
        getSaleItems();

    const inputs =
        document.querySelectorAll(
            ".return-qty"
        );

    const selected = [];

    for (const input of inputs) {

        const index =
            Number(input.dataset.index);

        const qty =
            Number(input.value) || 0;

        if (qty <= 0) {
            continue;
        }

        const originalItem =
            items[index];

        if (!originalItem) {
            continue;
        }

        const maxAllowed =
            getItemAvailable(
                originalItem
            );

        if (qty > maxAllowed) {

            showMessage(
                `${escapeHtml(
                    originalItem.name
                )}: only ${maxAllowed} item(s) can be returned.`,
                "error"
            );

            return null;
        }

        selected.push({
            id: originalItem.id,

            name: originalItem.name,

            sku:
                originalItem.sku || "",

            qty: qty,

            price:
                Number(
                    originalItem.price
                ) || 0
        });
    }

    return selected;
}


// ============================================================
// Calculate Return
// Calculates subtotal, VAT and refund total.
// ============================================================

function calculateReturn() {
    const selectedItems =
        getSelectedReturnItems() || [];

    let subtotal = 0;

    selectedItems.forEach(item => {

        subtotal +=
            Number(item.qty) *
            Number(item.price);

    });

    const vat =
        vatEnabled
            ? subtotal *
              (vatRate / 100)
            : 0;

    const total =
        subtotal + vat;

    updateItemTotals();

    $("returnSubtotal").textContent =
        formatMoney(subtotal);

    $("returnVat").textContent =
        formatMoney(vat);

    $("returnTotal").textContent =
        formatMoney(total);

    const summary =
        $("returnSummary");

    if (summary) {

        summary.hidden =
            selectedItems.length === 0;

        summary.style.display =
            selectedItems.length > 0
                ? "block"
                : "none";
    }

    return {
        items: selectedItems,
        subtotal,
        vat,
        total
    };
}


// ============================================================
// Update Item Totals
// Updates the total amount of each selected item.
// ============================================================

function updateItemTotals() {
    const items =
        getSaleItems();

    const rows =
        document.querySelectorAll(
            ".return-item"
        );

    rows.forEach(row => {

        const index =
            Number(row.dataset.index);

        const input =
            row.querySelector(
                ".return-qty"
            );

        const totalElement =
            row.querySelector(
                ".item-total"
            );

        if (
            !input ||
            !totalElement
        ) {
            return;
        }

        const qty =
            Number(input.value) || 0;

        const price =
            Number(
                items[index]?.price
            ) || 0;

        totalElement.textContent =
            formatMoney(
                qty * price
            );
    });
}


// ============================================================
// Full Return
// Selects the maximum returnable quantity for every item.
// ============================================================

function fullReturn() {
    if (!currentSale) {

        showMessage(
            "Please search for an invoice first.",
            "error"
        );

        return;
    }

    document
        .querySelectorAll(".return-qty")
        .forEach(input => {

            if (!input.disabled) {
                input.value =
                    input.max;
            }
        });

    calculateReturn();

    hideMessage();
}


// ============================================================
// Clear Return
// Resets all selected quantities.
// ============================================================

function clearReturn() {

    document
        .querySelectorAll(".return-qty")
        .forEach(input => {

            if (!input.disabled) {
                input.value = "0";
            }
        });

    calculateReturn();

    hideMessage();
}


// ============================================================
// Confirm Return Modal Handler
// Promises resolution based on modal confirmation/cancellation.
// ============================================================

function confirmReturn(calculation) {
    return new Promise(resolve => {

        const modal =
            $("returnConfirmModal");

        if (!modal) {

            resolve(
                window.confirm(
                    `Confirm return?\n\nRefund Total: ${formatMoney(
                        calculation.total
                    )}`
                )
            );

            return;
        }

        const invoiceLabelEl =
            $("confirmInvoiceLabel");

        const itemsListEl =
            $("confirmItemsList");

        const totalsEl =
            $("confirmTotals");

        const closeBtn =
            $("confirmModalClose");

        const cancelBtn =
            $("confirmCancelBtn");

        const okBtn =
            $("confirmOkBtn");

        if (invoiceLabelEl) {

            invoiceLabelEl.textContent =
                currentSale?.invoiceLabel ||
                formatInvoiceNumber(
                    currentSale?.invoiceNumber
                );
        }

        if (itemsListEl) {

            itemsListEl.innerHTML =
                calculation.items
                    .map(item => `
                        <div
                            class="confirm-item-row"
                            style="
                                display:flex;
                                justify-content:space-between;
                                margin-bottom:4px;
                            "
                        >

                            <span>
                                ${escapeHtml(
                                    item.name
                                )}
                                (x${item.qty})
                            </span>

                            <strong>
                                ${formatMoney(
                                    item.qty *
                                    item.price
                                )}
                            </strong>

                        </div>
                    `)
                    .join("");
        }

        if (totalsEl) {

            totalsEl.innerHTML = `
                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        font-weight:bold;
                        border-top:1px solid #ccc;
                        padding-top:8px;
                        margin-top:8px;
                    "
                >

                    <span>
                        Refund Total:
                    </span>

                    <span>
                        ${formatMoney(
                            calculation.total
                        )}
                    </span>

                </div>
            `;
        }

        const closeModal =
            result => {

                modal.hidden = true;
                modal.style.display = "none";

                okBtn?.removeEventListener(
                    "click",
                    onOk
                );

                cancelBtn?.removeEventListener(
                    "click",
                    onCancel
                );

                closeBtn?.removeEventListener(
                    "click",
                    onCancel
                );

                resolve(result);
            };

        const onOk =
            () => closeModal(true);

        const onCancel =
            () => closeModal(false);

        okBtn?.addEventListener(
            "click",
            onOk
        );

        cancelBtn?.addEventListener(
            "click",
            onCancel
        );

        closeBtn?.addEventListener(
            "click",
            onCancel
        );

        modal.hidden = false;
        modal.style.display = "flex";
    });
}


// ============================================================
// Return Receipt - Fill Receipt
// Fills the receipt preview with the processed return data.
// ============================================================

function fillReturnReceipt(
    returnData,
    result
) {
    const now = new Date();

    const returnLabel =
        result?.return?.returnLabel ||
        "RET-" +
        Date.now()
            .toString()
            .slice(-6);

    const returnLabelElement =
        $("rcptReturnLabel");

    if (returnLabelElement) {
        returnLabelElement.textContent =
            returnLabel;
    }

    const dateElement =
        $("rcptDate");

    if (dateElement) {
        dateElement.textContent =
            now.toLocaleString();
    }

    const invoiceElement =
        $("rcptInvoice");

    if (invoiceElement) {
        invoiceElement.textContent =
            currentSale?.invoiceLabel ||
            formatInvoiceNumber(
                currentSale?.invoiceNumber
            );
    }

    // Set cashier name when available from the API.
    const cashierElement =
        $("rcptCashier");

    if (cashierElement) {
        cashierElement.textContent =
            result?.return?.cashierName ||
            "-";
    }

    // Render returned items into the receipt.
    const itemsElement =
        $("rcptItems");

    if (itemsElement) {

        itemsElement.innerHTML =
            returnData.items
                .map(item => `
                    <tr>

                        <td>
                            ${escapeHtml(
                                item.name
                            )}
                        </td>

                        <td>
                            ${item.qty}
                        </td>

                        <td>
                            ${formatMoney(
                                item.qty *
                                item.price
                            )}
                        </td>

                    </tr>
                `)
                .join("");
    }

    // Render receipt totals.
    const subtotalElement =
        $("rcptSubtotal");

    if (subtotalElement) {
        subtotalElement.textContent =
            formatMoney(
                returnData.subtotal
            );
    }

    const vatElement =
        $("rcptVat");

    if (vatElement) {
        vatElement.textContent =
            formatMoney(
                returnData.vat
            );
    }

    const totalElement =
        $("rcptTotal");

    if (totalElement) {
        totalElement.textContent =
            formatMoney(
                returnData.total
            );
    }

    // Render the return reason when provided.
    const reasonRow =
        $("rcptReasonRow");

    if (reasonRow) {

        if (returnData.reason) {

            reasonRow.hidden = false;

            const reasonElement =
                $("rcptReason");

            if (reasonElement) {
                reasonElement.textContent =
                    returnData.reason;
            }

        } else {

            reasonRow.hidden = true;
        }
    }
}


// ============================================================
// Return Receipt - Preview Modal & Print
// Handles opening, closing and printing the receipt preview.
// ============================================================

function openReceiptPreview() {
    const modal =
        $("receiptPreviewModal");

    if (!modal) {
        console.warn(
            "[Returns] Receipt preview modal not found."
        );

        return;
    }

    modal.hidden = false;
    modal.style.display = "flex";

    document.body.style.overflow =
        "hidden";
}


// ============================================================
// Close Receipt Preview
// Closes the receipt preview modal.
// ============================================================

function closeReceiptPreview() {
    const modal =
        $("receiptPreviewModal");

    if (!modal) return;

    modal.hidden = true;
    modal.style.display = "none";

    document.body.style.overflow = "";

    // Clear the page after the receipt preview is closed.
    clearPage();
}


// ============================================================
// Wire Receipt Preview Buttons
// Connects receipt preview controls to their actions.
// ============================================================

function wireReceiptPreviewButtons() {

    // Print the receipt.
    $("receiptPrintBtn")
        ?.addEventListener(
            "click",
            () => {

                window.print();
            }
        );

    // Skip printing and close the preview.
    $("receiptSkipBtn")
        ?.addEventListener(
            "click",
            closeReceiptPreview
        );

    // Close the preview using the X button.
    $("receiptPreviewClose")
        ?.addEventListener(
            "click",
            closeReceiptPreview
        );

    // Close the preview when clicking the overlay.
    $("receiptPreviewModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    event.currentTarget
                ) {
                    closeReceiptPreview();
                }
            }
        );
}


// ============================================================
// Process Return
// Sends the return request to Electron.
// ============================================================

async function processReturn() {
    hideMessage();

    if (!currentSale) {

        showMessage(
            "Please search for an invoice first.",
            "error"
        );

        return;
    }

    const calculation =
        calculateReturn();

    if (
        !calculation.items ||
        calculation.items.length === 0
    ) {

        showMessage(
            "Please select at least one product to return.",
            "error"
        );

        return;
    }

    // Ask the user to confirm the return before processing it.
    const confirmed =
        await confirmReturn(
            calculation
        );

    if (!confirmed) {
        return;
    }

    const reason =
        $("returnReason")
            ?.value
            ?.trim() || "";

    const returnData = {

        saleId:
            currentSale.id,

        invoiceNumber:
            currentSale.invoiceNumber,

        invoiceLabel:
            currentSale.invoiceLabel ||
            formatInvoiceNumber(
                currentSale.invoiceNumber
            ),

        items:
            calculation.items,

        subtotal:
            calculation.subtotal,

        vat:
            calculation.vat,

        tax:
            calculation.vat,

        total:
            calculation.total,

        reason:
            reason
    };

    const submitButton =
        $("submitReturnBtn");

    try {

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                "Processing...";
        }

        const result =
            await window.api.createReturn(
                returnData
            );

        console.log(
            "[Returns] Create result:",
            result
        );

        if (
            !result ||
            result.success === false
        ) {

            showMessage(
                result?.message ||
                "Failed to process return.",
                "error"
            );

            return;
        }

        const returnLabel =
            result.return?.returnLabel ||
            "";

        showMessage(
            returnLabel
                ? `Return processed successfully (${returnLabel}).`
                : "Return processed successfully.",
            "success"
        );

        // Fill the receipt with the processed return information.
      fillReturnReceipt(returnData, result);

openReceiptPreview();   // ✅ عرض المعاينة بدل فتح الطابعة مباشرة


    } catch (error) {

        console.error(
            "[Returns] Create error:",
            error
        );

        showMessage(
            "Failed to process return.",
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Process Return";
        }
    }
}


// ============================================================
// Clear Page
// Resets the entire Returns workspace.
// ============================================================

function clearPage() {

    currentSale = null;

    const invoiceInput =
        $("invoiceSearch");

    if (invoiceInput) {
        invoiceInput.value = "";
    }

    const saleInfo =
        $("saleInfo");

    if (saleInfo) {

        saleInfo.hidden = true;
        saleInfo.style.display = "none";
    }

    const returnItems =
        $("returnItems");

    if (returnItems) {

        returnItems.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ↩
                </div>

                <strong>
                    No sale selected
                </strong>

                <span>
                    Search an invoice above to start a return.
                </span>

            </div>
        `;
    }

    const summary =
        $("returnSummary");

    if (summary) {

        summary.hidden = true;
        summary.style.display = "none";
    }

    const reason =
        $("returnReason");

    if (reason) {
        reason.value = "";
    }

    const subtotal =
        $("returnSubtotal");

    if (subtotal) {
        subtotal.textContent = "0.00";
    }

    const vat =
        $("returnVat");

    if (vat) {
        vat.textContent = "0.00";
    }

    const total =
        $("returnTotal");

    if (total) {
        total.textContent = "0.00";
    }

    const fullBtn =
        $("fullReturnBtn");

    const clearBtn =
        $("clearReturnBtn");

    const submitBtn =
        $("submitReturnBtn");

    if (fullBtn) {
        fullBtn.disabled = false;
    }

    if (clearBtn) {
        clearBtn.disabled = false;
    }

    if (submitBtn) {
        submitBtn.disabled = false;
    }

    hideMessage();
}


// ============================================================
// Clear Sale
// Clears only the currently loaded invoice.
// ============================================================

function clearSale() {

    currentSale = null;

    const saleInfo =
        $("saleInfo");

    if (saleInfo) {

        saleInfo.hidden = true;
        saleInfo.style.display = "none";
    }

    const returnItems =
        $("returnItems");

    if (returnItems) {

        returnItems.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ↩
                </div>

                <strong>
                    No invoice loaded
                </strong>

                <span>
                    Search another invoice to continue.
                </span>

            </div>
        `;
    }

    const summary =
        $("returnSummary");

    if (summary) {

        summary.hidden = true;
        summary.style.display = "none";
    }

    const subtotal =
        $("returnSubtotal");

    if (subtotal) {
        subtotal.textContent = "0.00";
    }

    const vat =
        $("returnVat");

    if (vat) {
        vat.textContent = "0.00";
    }

    const total =
        $("returnTotal");

    if (total) {
        total.textContent = "0.00";
    }
}


// ============================================================
// Escape HTML
// Protects product names and SKU values.
// ============================================================

function escapeHtml(value) {
    return String(value ?? "")
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
// Event Listeners
// Connects page controls to the return workflow.
// ============================================================

function initializeReturnsPage() {

    wireReceiptPreviewButtons();   // ← ضيف السطر ده

    clearPage();

    $("searchInvoiceBtn")
        ?.addEventListener(
            "click",
            searchInvoice
        );

    $("invoiceSearch")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    searchInvoice();
                }
            }
        );

    $("fullReturnBtn")
        ?.addEventListener(
            "click",
            fullReturn
        );

    $("clearReturnBtn")
        ?.addEventListener(
            "click",
            clearReturn
        );

    $("submitReturnBtn")
        ?.addEventListener(
            "click",
            processReturn
        );

    // Initialize receipt preview modal controls.
    wireReceiptPreviewButtons();

    clearPage();
}


// ============================================================
// Page Startup
// Loads VAT settings and initializes the page.
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadVatSettings();

        initializeReturnsPage();
    }
);