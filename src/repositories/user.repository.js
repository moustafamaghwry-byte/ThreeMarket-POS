// ============================================================
// ThreeMarket POS - User Repository
// Handles persistent storage and retrieval of user records
// using a local JSON file.
// ============================================================

const fs = require("fs");
const path = require("path");


// ============================================================
// Configuration
// ============================================================

const DATA_DIR = path.join(
    __dirname,
    "../../data"
);

const USERS_FILE = path.join(
    DATA_DIR,
    "users.json"
);


// ============================================================
// Ensure Data Directory
// ============================================================

function ensureDataDir() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            { recursive: true }
        );

    }

}


// ============================================================
// Load All Users
// ============================================================

function loadUsers() {

    ensureDataDir();

    if (!fs.existsSync(USERS_FILE)) {

        return [];

    }

    try {

        const data =
            fs.readFileSync(
                USERS_FILE,
                "utf-8"
            );

        const parsed = JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "User repository load error:",
            error
        );

        return [];

    }

}


// ============================================================
// Save All Users
// ============================================================

function saveUsers(users) {

    ensureDataDir();

    try {

        fs.writeFileSync(

            USERS_FILE,

            JSON.stringify(
                users,
                null,
                4
            ),

            "utf-8"

        );

        return true;

    } catch (error) {

        console.error(
            "User repository save error:",
            error
        );

        return false;

    }

}


// ============================================================
// Find All Users
// ============================================================

function findAll() {

    return loadUsers();

}


// ============================================================
// Find User by ID
// ============================================================

function findById(id) {

    const users = loadUsers();

    return users.find(
        (user) => user.id === id
    ) || null;

}


// ============================================================
// Find User by Username (case-insensitive)
// ============================================================

function findByUsername(username) {

    if (!username) {

        return null;

    }

    const users = loadUsers();

    const normalized =
        username.trim().toLowerCase();

    return users.find(

        (user) =>

            user.username
                .toLowerCase() ===
            normalized

    ) || null;

}


// ============================================================
// Save (Create or Update)
// If user has no id, creates new. If id exists, updates.
// ============================================================
function save(user) {

    const users = loadUsers();

    const index = user.id
        ? users.findIndex((u) => u.id === user.id)
        : -1;

    if (index !== -1) {

        // ----------------------------------------------------
        // Update existing user
        // ----------------------------------------------------

        users[index] = {

            ...users[index],

            ...user,

            id: users[index].id  // Prevent ID overwrite

        };

    } else {

        // ----------------------------------------------------
        // Create new user
        // ----------------------------------------------------

        users.push(user);

    }

    const saved = saveUsers(users);

    if (!saved) {

        return {

            success: false,

            message: "Failed to save user data."

        };

    }

    return {

        success: true,

        user

    };

}


// ============================================================
// Update User by ID
// ============================================================

function updateById(id, updates) {

    const users = loadUsers();

    const index = users.findIndex(

        (user) => user.id === id

    );

    if (index === -1) {

        return {

            success: false,

            message: "User not found."

        };

    }

    users[index] = {

        ...users[index],

        ...updates,

        id: users[index].id  // Prevent ID overwrite

    };

    const saved = saveUsers(users);

    if (!saved) {

        return {

            success: false,

            message: "Failed to update user."

        };

    }

    return {

        success: true,

        user: users[index]

    };

}


// ============================================================
// Delete User by ID
// ============================================================

function deleteById(id) {

    const users = loadUsers();

    const filtered = users.filter(

        (user) => user.id !== id

    );

    if (filtered.length === users.length) {

        return {

            success: false,

            message: "User not found."

        };

    }

    const saved = saveUsers(filtered);

    if (!saved) {

        return {

            success: false,

            message: "Failed to delete user."

        };

    }

    return {

        success: true,

        message: "User deleted successfully."

    };

}


// ============================================================
// Seed Default Admin
// Creates a default admin if no users exist.
// Requires a pre-hashed password from auth.service.
// ============================================================

function seedDefaultAdmin(hashedPassword) {

    const users = loadUsers();

    if (users.length > 0) {

        return null;

    }

    const admin = {

        id: require("crypto").randomUUID(),

        username: "admin",

        password: hashedPassword,

        role: "administrator",

        language: "en",

        active: true,

        createdAt: new Date().toISOString()

    };

    users.push(admin);

    saveUsers(users);

    return admin;

}


// ============================================================
// Exports
// ============================================================

module.exports = {

    findAll,

    findById,

    findByUsername,

    save,

    updateById,

    deleteById,

    seedDefaultAdmin

};