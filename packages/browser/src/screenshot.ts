import { withPage } from "./pool.js";

export interface ScreenshotResult {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function takeScreenshot(
  url: string,
  options?: { fullPage?: boolean; width?: number; height?: number }
): Promise<ScreenshotResult> {
  return withPage(async (page) => {
    await page.setViewportSize({
      width: options?.width ?? 1280,
      height: options?.height ?? 720,
    });
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
  });
}
