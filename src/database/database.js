// ============================================================
// ThreeMarket POS - SQLite Database Manager
// Creates and manages the application's SQLite database.
// ============================================================

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let db = null;

/**
 * Initialize the SQLite database.
 *
 * @param {string} userDataPath - Electron's app.getPath("userData")
 * @returns {Database.Database}
 */
function initializeDatabase(userDataPath) {
    if (db) {
        return db;
    }

    if (!userDataPath) {
        throw new Error(
            "[Database] userDataPath is required to initialize SQLite."
        );
    }

    const databaseDirectory = path.join(userDataPath, "database");

    // Ensure the database directory exists.
    fs.mkdirSync(databaseDirectory, {
        recursive: true
    });

    const databasePath = path.join(
        databaseDirectory,
        "threemarket.db"
    );

    console.log(
        `[Database] Opening SQLite database: ${databasePath}`
    );

    db = new Database(databasePath);

    // Recommended SQLite settings for a local desktop application.
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    console.log("[Database] SQLite database initialized successfully.");

    return db;
}

/**
 * Get the active database connection.
 *
 * @returns {Database.Database}
 */
function getDatabase() {
    if (!db) {
        throw new Error(
            "[Database] Database has not been initialized yet."
        );
    }

    return db;
}

/**
 * Close the database connection.
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;

        console.log("[Database] SQLite database connection closed.");
    }
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase
};