import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// mirror tsconfig's "@/*" -> "./*" path alias so tests import the real app modules
export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        include: ["test/**/*.test.ts"],
    },
});
