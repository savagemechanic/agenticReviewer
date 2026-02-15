import { chromium, Browser } from "playwright";

export * from "./crawlers/index.js";
export { withPage } from "./pool.js";
export { takeScreenshot, type ScreenshotResult } from "./screenshot.js";
export { extractPageData, type ExtractionResult } from "./extraction.js";
export { measureTiming, type TimingResult } from "./timing.js";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
