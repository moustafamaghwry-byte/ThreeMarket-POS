const User = require("../models/user.model");

const users = [
    new User({
        id: 1,
        username: "admin",
        password: "admin123",
        role: "admin",
        language: "en"
    })
];

function findByUsername(username) {
    return users.find(
        user =>
            user.username.toLowerCase() === username.toLowerCase()
    );
}

module.exports = {
    findByUsername
};