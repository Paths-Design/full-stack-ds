import { defineConfig, devices } from "@playwright/test";

const variant = process.env.FSDS_ANALYTICAL_CONTROL === "renderer" ? "renderer" : "baseline";
const root = "tmp/analytical-browser-proof";
export default defineConfig({
  testDir: "./e2e", testMatch: "analytical-composite.spec.ts", workers: 1,
  forbidOnly: !!process.env.CI, retries: 0, timeout: 60_000,
  outputDir: `${root}/${variant}-results`,
  reporter: [["list"], ["json", { outputFile: `${root}/${variant}-report.json` }]],
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:5198", trace: "retain-on-failure" },
  webServer: {
    command: `pnpm exec vite preview --outDir ${root}/${variant} --host 127.0.0.1 --port 5198 --strictPort`,
    url: "http://127.0.0.1:5198", reuseExistingServer: false, timeout: 30_000,
  },
});
