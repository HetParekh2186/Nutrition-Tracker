import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // SPEC.md: 90%+ for the nutrition math and the recommender.
      include: ["src/lib/nutrition/**/*.ts", "src/lib/recommend/**/*.ts"],
      // Database-bound modules are covered by smoke scripts and e2e tests.
      exclude: [
        "**/*.test.ts",
        "src/lib/recommend/service.ts",
        "src/lib/recommend/*-repo.ts",
        "src/lib/recommend/interactions.ts",
        "src/lib/recommend/types.ts",
      ],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
