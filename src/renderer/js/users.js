// ============================================================
// ThreeMarket POS - Users Page
// Admin-only: create, edit, delete, manage permissions
// ============================================================

import { loadTranslations, toggleLanguage, getTranslation } from "./i18n.js";
import { loadAppShell } from "./component-loader.js";
import { initializeNavigation, checkRedirectLoop } from "./navigation.js";
import permissionsConfig from "../config/permissions.config.json";

let users = [];
let editingUserId = null;

const ALL_PAGES = permissionsConfig.allPages;
const ROLE_PRESETS = permissionsConfig.rolePresets;

async function initializeUsers() {
    try {
        const session = await window.api.getSession();
        if (!session) {
            window.location.href = "/";
            return;
        }

        // Admin-only guard
       // Admin-only guard
        if (session.role !== "admin" && session.role !== "administrator") {
            if (checkRedirectLoop()) return;
            window.location.href = "/pages/dashboard.html";
            return;
        }

        await loadAppShell();
        await loadTranslations();
        initializeNavigation();

        const usernameEl = document.getElementById("currentUsername");
        const roleEl = document.getElementById("currentRole");
        if (usernameEl) usernameEl.textContent = session.username;
        if (roleEl) roleEl.textContent = session.role;

document.getElementById("languageButton")?.addEventListener("click", async () => {
            await toggleLanguage();
            renderUsers(users);
        });
                document.getElementById("logoutButton")?.addEventListener("click", async () => {
            await window.api.logout();
            window.location.href = "/";
        });

        await loadUsers();
        initializeUserModal();

        console.log("Users page initialized");

    } catch (error) {
        console.error("Users initialization error:", error);
    }
}

// ============================================================
// Load Users
// ============================================================

async function loadUsers() {
    try {
        const result = await window.api.getAllUsers();
        users = Array.isArray(result) ? result : [];
        renderUsers(users);
    } catch (error) {
        console.error("Failed to load users:", error);
        users = [];
    }
}

// ============================================================
// Render Users Table
// ============================================================

function renderUsers(userList) {
    const tbody = document.getElementById("usersTableBody");
    const emptyState = document.getElementById("usersEmptyState");
    const tableContainer = document.querySelector(".table-container");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!userList.length) {
        tableContainer.style.display = "none";
        emptyState.style.display = "flex";
        return;
    }

    tableContainer.style.display = "block";
    emptyState.style.display = "none";

    userList.forEach(user => {
       const row = document.createElement("tr");
        const roleClass = user.role === "administrator" ? "admin" : user.role;
        const roleLabel = getTranslation(`users.roles.${roleClass}`);
        const perms = user.permissions || ROLE_PRESETS[user.role] || {};
        const permTags = Object.entries(perms)
            .filter(([_, v]) => v !== "none")
            .map(([k, v]) => `<span class="perm-tag ${v}">${getTranslation(`nav.${k}`)}: ${getTranslation(`users.permissionLevels.${v}`)}</span>`)
            .join("");

        row.innerHTML = `
            <td><strong>${escapeHtml(user.username)}</strong></td>
            <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
            <td><div class="perm-summary">${permTags || `<span class="perm-tag">${getTranslation('users.permissionLevels.none')}</span>`}</div></td>
            <td><span class="status-badge ${user.active !== false ? 'active' : 'inactive'}">${user.active !== false ? getTranslation('common.active') : getTranslation('common.inactive')}</span></td>
               <div class="table-actions">
                    <button class="table-action-button edit" data-action="edit" data-id="${user.id}">${getTranslation('users.actions.edit')}</button>
                    <button class="table-action-button delete" data-action="delete" data-id="${user.id}">${getTranslation('users.actions.delete')}</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Event delegation
    tbody.addEventListener("click", handleUserAction);
}

function handleUserAction(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") openEditModal(id);
    if (action === "delete") deleteUser(id);
}

// ============================================================
// User Modal
// ============================================================

function initializeUserModal() {
    const modal = document.getElementById("userModal");
    const addBtn = document.getElementById("addUserButton");
    const emptyAddBtn = document.getElementById("emptyAddUserButton");
    const closeBtn = document.getElementById("closeUserModal");
    const cancelBtn = document.getElementById("cancelUserButton");
    const form = document.getElementById("userForm");
    const roleSelect = document.getElementById("userRole");

    addBtn?.addEventListener("click", () => openUserModal());
    emptyAddBtn?.addEventListener("click", () => openUserModal());
    closeBtn?.addEventListener("click", closeUserModal);
    cancelBtn?.addEventListener("click", closeUserModal);
    form?.addEventListener("submit", handleUserSubmit);

    roleSelect?.addEventListener("change", () => {
        updatePermissionsGrid(roleSelect.value);
    });

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) closeUserModal();
    });
}

function openUserModal(user = null) {
    editingUserId = user ? user.id : null;
    const modal = document.getElementById("userModal");
    const form = document.getElementById("userForm");
    const title = document.getElementById("userModalTitle");
    const errorEl = document.getElementById("userFormError");

    form.reset();
    errorEl.style.display = "none";
    errorEl.textContent = "";

    if (user) {
        title.textContent = "Edit User";
        document.getElementById("userUsername").value = user.username;
        document.getElementById("userPassword").placeholder = "Leave blank to keep current";
        document.getElementById("userPassword").required = false;
        document.getElementById("userRole").value = user.role;
        document.getElementById("userLanguage").value = user.language || "en";
        document.getElementById("userActive").checked = user.active !== false;
        updatePermissionsGrid(user.role, user.permissions);
    } else {
        title.textContent = "Add User";
        document.getElementById("userPassword").required = true;
        updatePermissionsGrid("admin");
    }

    modal.style.display = "flex";
}

function closeUserModal() {
    document.getElementById("userModal").style.display = "none";
    editingUserId = null;
}

function updatePermissionsGrid(role, existingPerms = null) {
    const grid = document.getElementById("permissionsGrid");
    const section = document.getElementById("permissionsSection");
    
    if (!grid) return;

    // Hide permissions for preset roles (except custom)
    if (role !== "custom") {
        section.style.display = "none";
        return;
    }
    
    section.style.display = "block";
    const presets = existingPerms || ROLE_PRESETS[role] || {};
    
    grid.innerHTML = ALL_PAGES.map(page => `
        <div class="permission-row">
            <label>${page}</label>
            <select class="permission-select" data-page="${page}">
                <option value="none" ${(presets[page] || "none") === "none" ? "selected" : ""}>No Access</option>
                <option value="read" ${(presets[page] || "none") === "read" ? "selected" : ""}>Read Only</option>
                <option value="write" ${(presets[page] || "none") === "write" ? "selected" : ""}>Read & Write</option>
            </select>
        </div>
    `).join("");
}

async function handleUserSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById("userFormError");

    const username = document.getElementById("userUsername").value.trim();
    const password = document.getElementById("userPassword").value;
    const role = document.getElementById("userRole").value;
    const language = document.getElementById("userLanguage").value;
    const active = document.getElementById("userActive").checked;

    if (!username) {
        showError("Username is required.");
        return;
    }

    if (!editingUserId && !password) {
        showError("Password is required for new users.");
        return;
    }

    // Build permissions
    let permissions = {};
    if (role === "custom") {
        document.querySelectorAll(".permission-select").forEach(select => {
            const page = select.dataset.page;
            const value = select.value;
            if (value !== "none") permissions[page] = value;
        });
    } else {
        permissions = ROLE_PRESETS[role] || {};
    }

    const userData = {
        username,
        role,
        language,
        active,
        permissions
    };

    if (password) userData.password = password;

    try {
        let result;
        if (editingUserId) {
            result = await window.api.updateUser(editingUserId, userData);
        } else {
            result = await window.api.createUser(userData);
        }

        if (!result.success) {
            showError(result.message || "Failed to save user.");
            return;
        }

        await loadUsers();
        closeUserModal();

    } catch (error) {
        console.error("Save user error:", error);
        showError("An unexpected error occurred.");
    }
}

function showError(msg) {
    const el = document.getElementById("userFormError");
    el.textContent = msg;
    el.style.display = "block";
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
        const result = await window.api.deleteUser(id);
        if (result.success) {
            await loadUsers();
        } else {
            alert(result.message || "Failed to delete user.");
        }
    } catch (error) {
        console.error("Delete user error:", error);
    }
}

function openEditModal(id) {
    const user = users.find(u => u.id === id);
    if (user) openUserModal(user);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", initializeUsers);