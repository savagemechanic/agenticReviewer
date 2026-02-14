import { withPage } from "./pool.js";

export interface ExtractionResult {
  title: string;
  headings: string[];
  bodyText: string;
  loadTimeMs: number;
}

export async function extractPageData(url: string): Promise<ExtractionResult> {
  return withPage(async (page) => {
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
  });
}
