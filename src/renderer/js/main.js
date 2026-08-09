import { applyLanguage, toggleLanguage } from "./i18n.js";
import "./auth.js";

console.log("ThreeMarket POS Started");

document.addEventListener("DOMContentLoaded", () => {
    console.log("ThreeMarket POS UI Ready");

    applyLanguage();

    const languageButton =
        document.getElementById("languageButton");

    if (languageButton) {
        languageButton.addEventListener(
            "click",
            toggleLanguage
        );
    }
});