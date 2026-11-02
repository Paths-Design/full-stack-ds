import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "../../e2e",
  testMatch: "lit-token-inheritance.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: { ...devices["Desktop Chrome"], colorScheme: "dark", viewport: { width: 420, height: 1000 } },
});
