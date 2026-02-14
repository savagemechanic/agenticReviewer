import { withPage } from "./pool.js";

export interface TimingResult {
  ttfb: number;
  fcp: number;
  domContentLoaded: number;
  load: number;
}

export async function measureTiming(url: string): Promise<TimingResult> {
  return withPage(async (page) => {
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
  });
}
