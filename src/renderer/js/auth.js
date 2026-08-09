const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    loginMessage.textContent = "";

    if (!username || !password) {
        loginMessage.textContent =
            "Please enter username and password.";

        return;
    }

    try {
        const result = await window.api.login(
            username,
            password
        );

        console.log("Login result:", result);

        if (result.success) {
            loginMessage.textContent =
                `Welcome ${result.user.username}`;

            console.log("Authenticated user:", result.user);

            // Dashboard will be connected here next.
        } else {
            loginMessage.textContent =
                result.message;
        }

    } catch (error) {
        console.error("Login error:", error);

        loginMessage.textContent =
            "An unexpected error occurred.";
    }
});