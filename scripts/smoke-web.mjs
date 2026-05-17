import { chromium } from "playwright";

const baseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${baseUrl}/workspace`, { waitUntil: "networkidle" });
await page.getByText("IntelliSight").waitFor({ timeout: 10_000 });
await page.screenshot({ path: "/tmp/intellisight-smoke.png", fullPage: true });
await browser.close();

if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exit(1);
}

console.log(`Smoke test passed: ${baseUrl}/workspace`);
