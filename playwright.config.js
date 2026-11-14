const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: "http://localhost:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: "npm run start:frontend",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            BROWSER: "none",
            CI: "true",
        },
    },
});
