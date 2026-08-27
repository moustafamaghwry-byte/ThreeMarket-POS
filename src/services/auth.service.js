// ============================================================
// ThreeMarket POS - Authentication Service
// ============================================================

const crypto = require("crypto");
const userRepository = require("../repositories/user.repository");

// Default role presets for permissions
const ROLE_PRESETS = {
    admin: {
        dashboard: "write",
        sales: "write",
        products: "write",
        inventory: "write",
        customers: "write",
        suppliers: "write",
        reports: "write",
        settings: "write",
        users: "write"
    },
    manager: {
        dashboard: "write",
        sales: "write",
        products: "write",
        inventory: "write",
        customers: "write",
        suppliers: "write",
        reports: "write",
        settings: "none",
        users: "none"
    },
    cashier: {
        dashboard: "none",
        sales: "write",
        products: "read",
        inventory: "none",
        customers: "read",
        suppliers: "none",
        reports: "none",
        settings: "none",
        users: "none"
    }
};

// ============================================================
// Hash & Verify
// ============================================================

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return computed === hash;
}


// ============================================================
// Login
// ============================================================

function login(username, password) {
    if (!username || !password) {
        return { success: false, message: "Username and password are required." };
    }

    const user = userRepository.findByUsername(username);
    if (!user) {
        return { success: false, message: "Invalid username or password." };
    }

    if (!user.active) {
        return { success: false, message: "User account is inactive." };
    }

    if (!verifyPassword(password, user.password)) {
        return { success: false, message: "Invalid username or password." };
    }

    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            language: user.language,
            active: user.active,
            permissions: user.permissions || ROLE_PRESETS[user.role] || {}
        }
    };
}


// ============================================================
// Create User
// ============================================================

function createUser(userData) {
    const { username, password, role = "cashier", language = "en", active = true, permissions } = userData;

    if (!username || !password) {
        return { success: false, message: "Username and password are required." };
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
        return { success: false, message: "Username must be at least 3 characters." };
    }

    if (password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters." };
    }

    const validRoles = ["admin", "manager", "cashier", "custom"];
    if (!validRoles.includes(role)) {
        return { success: false, message: "Invalid role. Must be admin, manager, cashier, or custom." };
    }

    const existing = userRepository.findByUsername(trimmedUsername);
    if (existing) {
        return { success: false, message: "Username already exists." };
    }

    const newUser = {
        id: crypto.randomUUID(),
        username: trimmedUsername,
        password: hashPassword(password),
        role,
        language,
        active,
        permissions: permissions || ROLE_PRESETS[role] || {}, // ✅ Added
        createdAt: new Date().toISOString()
    };

    const result = userRepository.save(newUser);
    if (!result.success) return result;

    return {
        success: true,
        user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            language: newUser.language,
            active: newUser.active,
            permissions: newUser.permissions
        }
    };
}


// ============================================================
// Get All Users
// ============================================================

function getAllUsers() {
    return userRepository.findAll().map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        language: user.language,
        active: user.active,
        permissions: user.permissions || ROLE_PRESETS[user.role] || {},
        createdAt: user.createdAt
    }));
}


// ============================================================
// Update User
// ============================================================

function updateUser(id, updates) {
    const user = userRepository.findById(id);
    if (!user) {
        return { success: false, message: "User not found." };
    }

    if (updates.username && updates.username !== user.username) {
        const existing = userRepository.findByUsername(updates.username.trim());
        if (existing) {
            return { success: false, message: "Username already exists." };
        }
    }

    const validRoles = ["admin", "manager", "cashier", "custom"];
    if (updates.role && !validRoles.includes(updates.role)) {
        return { success: false, message: "Invalid role." };
    }

    const updated = {
        ...updates,
        id: user.id,
        password: updates.password ? hashPassword(updates.password) : user.password,
        permissions: updates.permissions || (updates.role ? ROLE_PRESETS[updates.role] : user.permissions)
    };

    return userRepository.updateById(id, updated);
}


// ============================================================
// Delete User
// ============================================================

function deleteUser(id) {
    return userRepository.deleteById(id);
}


// ============================================================
// Change Password
// ============================================================

function changePassword(id, oldPassword, newPassword) {
    const user = userRepository.findById(id);
    if (!user) {
        return { success: false, message: "User not found." };
    }

    if (!verifyPassword(oldPassword, user.password)) {
        return { success: false, message: "Current password is incorrect." };
    }

    if (newPassword.length < 6) {
        return { success: false, message: "New password must be at least 6 characters." };
    }

    return userRepository.updateById(id, {
        password: hashPassword(newPassword)
    });
}


// ============================================================
// Seed Default Users
// ============================================================

function seedDefaultUsers() {
    const users = userRepository.findAll();
    if (users.length > 0) return;

    const defaultUsers = [
        {
            id: crypto.randomUUID(),
            username: "admin",
            password: hashPassword("admin"),
            role: "admin",
            language: "en",
            active: true,
            permissions: ROLE_PRESETS.admin,
            createdAt: new Date().toISOString()
        },
        {
            id: crypto.randomUUID(),
            username: "manager",
            password: hashPassword("manager"),
            role: "manager",
            language: "en",
            active: true,
            permissions: ROLE_PRESETS.manager,
            createdAt: new Date().toISOString()
        },
        {
            id: crypto.randomUUID(),
            username: "cashier",
            password: hashPassword("cashier"),
            role: "cashier",
            language: "en",
            active: true,
            permissions: ROLE_PRESETS.cashier,
            createdAt: new Date().toISOString()
        }
    ];

    defaultUsers.forEach(user => userRepository.save(user));

    console.log("[Auth] Default users created:");
    console.log("  - admin / admin (Admin)");
    console.log("  - manager / manager (Manager)");
    console.log("  - cashier / cashier (Cashier)");
}


// ============================================================
// Initialize
// ============================================================

seedDefaultUsers();


// ============================================================
// Export
// ============================================================

module.exports = {
    login,
    createUser,
    getAllUsers,
    updateUser,
    deleteUser,
    changePassword,
    hashPassword
};