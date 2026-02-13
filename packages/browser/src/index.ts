import { chromium, Browser, Page } from "playwright";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
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

export interface ScreenshotResult {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function takeScreenshot(
  url: string,
  options?: { fullPage?: boolean; width?: number; height?: number }
): Promise<ScreenshotResult> {
  const b = await getBrowser();
  const page = await b.newPage({
    viewport: {
      width: options?.width ?? 1280,
      height: options?.height ?? 720,
    },
  });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const buffer = await page.screenshot({
      fullPage: options?.fullPage ?? false,
      type: "png",
    });
    return {
      buffer: Buffer.from(buffer),
      width: options?.width ?? 1280,
      height: options?.height ?? 720,
    };
  } finally {
    await page.close();
  }
}

export interface ExtractionResult {
  title: string;
  headings: string[];
  bodyText: string;
  loadTimeMs: number;
}

export async function extractPageData(url: string): Promise<ExtractionResult> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    const start = Date.now();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const loadTimeMs = Date.now() - start;

    const title = await page.title();
    const headings = await page.$$eval("h1, h2, h3", (els) =>
      els.map((el) => el.textContent?.trim() ?? "")
    );
    const bodyText = await page.evaluate(() => {
      const el = document.querySelector("body");
      return el?.innerText?.slice(0, 10000) ?? "";
    });

    return { title, headings, bodyText, loadTimeMs };
  } finally {
    await page.close();
  }
}

export interface TimingResult {
  ttfb: number;
  fcp: number;
  domContentLoaded: number;
  load: number;
}

export async function measureTiming(url: string): Promise<TimingResult> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return {
        ttfb: nav.responseStart - nav.requestStart,
        fcp: 0,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        load: nav.loadEventEnd - nav.startTime,
      };
    });
    // Try to get FCP
    const fcp = await page.evaluate(() => {
      const entry = performance.getEntriesByName("first-contentful-paint")[0];
      return entry?.startTime ?? 0;
    });
    return { ...timing, fcp };
  } finally {
    await page.close();
  }
}
