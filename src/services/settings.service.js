// ============================================================
// ThreeMarket POS - Settings Service
// Stores application-wide settings persistently inside the
// Electron userData directory.
// ============================================================

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// ============================================================
// Default Settings
// ============================================================

const DEFAULT_SETTINGS = {
    tax: {
        vatEnabled: false,
        vatRate: 14
    }
};

// ============================================================
// Settings File
// ============================================================

function getSettingsDirectory() {
    return app.getPath("userData");
}

function getSettingsFile() {
    return path.join(
        getSettingsDirectory(),
        "settings.json"
    );
}

// ============================================================
// Ensure Settings File Exists
// ============================================================

function ensureSettingsFile() {
    const file = getSettingsFile();

    try {
        if (!fs.existsSync(file)) {
            fs.mkdirSync(
                getSettingsDirectory(),
                {
                    recursive: true
                }
            );

            fs.writeFileSync(
                file,
                JSON.stringify(
                    DEFAULT_SETTINGS,
                    null,
                    4
                ),
                "utf8"
            );
        }
    } catch (error) {
        console.error(
            "[SETTINGS] Failed to create settings file:",
            error
        );
    }
}

// ============================================================
// Read Settings
// ============================================================

function readSettings() {
    ensureSettingsFile();

    const file = getSettingsFile();

    try {
        if (!fs.existsSync(file)) {
            return {
                ...DEFAULT_SETTINGS
            };
        }

        const content = fs.readFileSync(
            file,
            "utf8"
        );

        const parsed = JSON.parse(content);

        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            tax: {
                ...DEFAULT_SETTINGS.tax,
                ...(parsed.tax || {})
            }
        };
    } catch (error) {
        console.error(
            "[SETTINGS] Failed to read settings:",
            error
        );

        return {
            ...DEFAULT_SETTINGS
        };
    }
}

// ============================================================
// Write Settings
// ============================================================

function writeSettings(settings) {
    const file = getSettingsFile();

    try {
        fs.mkdirSync(
            getSettingsDirectory(),
            {
                recursive: true
            }
        );

        fs.writeFileSync(
            file,
            JSON.stringify(
                settings,
                null,
                4
            ),
            "utf8"
        );

        return true;
    } catch (error) {
        console.error(
            "[SETTINGS] Failed to save settings:",
            error
        );

        return false;
    }
}

// ============================================================
// Get Tax Settings
// ============================================================

function getTaxSettings() {
    const settings = readSettings();

    return {
        vatEnabled: Boolean(
            settings.tax?.vatEnabled
        ),
        vatRate: Number(
            settings.tax?.vatRate
        ) || 0
    };
}

// ============================================================
// Save Tax Settings
// ============================================================

function saveTaxSettings(taxSettings) {
    const settings = readSettings();

    const vatEnabled =
        Boolean(taxSettings?.vatEnabled);

    let vatRate =
        Number(taxSettings?.vatRate);

    if (!Number.isFinite(vatRate)) {
        vatRate = 14;
    }

    vatRate = Math.max(
        0,
        Math.min(vatRate, 100)
    );

    settings.tax = {
        vatEnabled,
        vatRate
    };

    const saved = writeSettings(settings);

    if (!saved) {
        return {
            success: false,
            message: "Failed to save tax settings."
        };
    }

    console.log(
        "[SETTINGS] VAT saved:",
        settings.tax
    );

    return {
        success: true,
        settings: {
            ...settings.tax
        }
    };
}

// ============================================================
// Export
// ============================================================

module.exports = {
    getTaxSettings,
    saveTaxSettings,
    readSettings,
    writeSettings
};