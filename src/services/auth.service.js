const userRepository = require("../repositories/user.repository");

function login(username, password) {

    const user = userRepository.findByUsername(username);

    if (!user) {
        return {
            success: false,
            message: "Invalid username or password"
        };
    }

    if (!user.active) {
        return {
            success: false,
            message: "User account is inactive"
        };
    }

    if (user.password !== password) {
        return {
            success: false,
            message: "Invalid username or password"
        };
    }

    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            language: user.language
        }
    };
}

module.exports = {
    login
};