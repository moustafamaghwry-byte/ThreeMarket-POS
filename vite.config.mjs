import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    root: "./src/renderer",
    base: "./",
    build: {
        outDir: "../../dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, "src/renderer/index.html"),
                dashboard: resolve(__dirname, "src/renderer/pages/dashboard.html"),
                sales: resolve(__dirname, "src/renderer/pages/sales.html"),
                products: resolve(__dirname, "src/renderer/pages/products.html"),
                users: resolve(__dirname, "src/renderer/pages/users.html"),
                settings: resolve(__dirname, "src/renderer/pages/settings.html"),
                returns: resolve(__dirname, "src/renderer/pages/returns.html")
            }
        }
    },
    server: {
        port: 5173
    }
});