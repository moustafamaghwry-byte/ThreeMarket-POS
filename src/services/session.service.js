// ============================================================
// ThreeMarket POS - Session Service
// Manages authenticated user sessions in the main process.
// Sessions live in memory and expire after inactivity.
// ============================================================

const crypto = require("crypto");


// ============================================================
// Session State
// ============================================================

let currentSession = null;
let sessionTimeoutId = null;


// ============================================================
// Configuration
// ============================================================

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours


// ============================================================
// Create Session
// Stores the authenticated user and starts the timeout timer.
// ============================================================

function createSession(user) {

    clearTimeout(sessionTimeoutId);

    currentSession = {

        id: crypto.randomUUID(),

        userId: user.id,

        username: user.username,

        role: user.role,

        language: user.language,

        permissions: user.permissions || {},

        loginAt: new Date().toISOString(),

        lastActivityAt: new Date().toISOString()

    };

    startSessionTimer();

    console.log(
        "[Session] Created for user:",
        user.username
    );

    return currentSession;

}


// ============================================================
// Get Session
// Returns the active session or null if expired / missing.
// Also refreshes last activity on every valid call.
// ============================================================

function getSession() {

    if (!currentSession) {

        return null;

    }

    // --------------------------------------------------------
    // Check if session has timed out.
    // --------------------------------------------------------

    const now = Date.now();

    const lastActivity = new Date(
        currentSession.lastActivityAt
    ).getTime();

    const inactive = now - lastActivity;

    if (inactive > SESSION_TIMEOUT_MS) {

        console.log(
            "[Session] Expired due to inactivity."
        );

        clearSession();

        return null;

    }

    // --------------------------------------------------------
    // Refresh last activity timestamp.
    // --------------------------------------------------------

    currentSession.lastActivityAt =
        new Date().toISOString();

    return currentSession;

}


// ============================================================
// Clear Session
// Destroys the current session and stops the timeout timer.
// ============================================================

function clearSession() {

    if (currentSession) {

        console.log(
            "[Session] Cleared for user:",
            currentSession.username
        );

    }

    currentSession = null;

    clearTimeout(sessionTimeoutId);

    sessionTimeoutId = null;

}


// ============================================================
// Start Session Timer
// Auto-clears the session after the timeout period.
// ============================================================

function startSessionTimer() {

    clearTimeout(sessionTimeoutId);

    sessionTimeoutId = setTimeout(
        () => {

            console.log(
                "[Session] Auto-expired after",
                SESSION_TIMEOUT_MS / 1000 / 60,
                "minutes."
            );

            clearSession();

        },

        SESSION_TIMEOUT_MS

    );

}


// ============================================================
// Export
// ============================================================

module.exports = {
    createSession,
    getSession,
    clearSession
};