class User {
    constructor({
        id,
        username,
        password,
        role = "cashier",
        language = "en",
        active = true
    }) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role;
        this.language = language;
        this.active = active;
    }
}

module.exports = User;