let currentSession = null;

function createSession(user) {
    currentSession = {
        userId: user.id,
        username: user.username,
        role: user.role,
        language: user.language,
        loginAt: new Date().toISOString()
    };

    return currentSession;
}

function getSession() {
    return currentSession;
}

function clearSession() {
    currentSession = null;
}

function isAuthenticated() {
    return currentSession !== null;
}

module.exports = {
    createSession,
    getSession,
    clearSession,
    isAuthenticated
};