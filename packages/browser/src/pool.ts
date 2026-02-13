import { Page, Browser } from "playwright";
import { chromium } from "playwright";

let browser: Browser | null = null;

async function getBrowserInternal(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browser;
}

async function closeBrowserInternal(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

interface Semaphore {
  count: number;
  max: number;
  queue: Array<() => void>;
}

const semaphore: Semaphore = {
  count: 0,
  max: 3,
  queue: [],
};

let pageCount = 0;
const MAX_PAGES_BEFORE_RECYCLE = 10;

async function acquire(): Promise<void> {
  if (semaphore.count < semaphore.max) {
    semaphore.count++;
    return;
  }

  return new Promise<void>((resolve) => {
    semaphore.queue.push(resolve);
  });
}

function release(): void {
  const next = semaphore.queue.shift();
  if (next) {
    next();
  } else {
    semaphore.count--;
  }
}

async function recycleBrowserIfNeeded(): Promise<void> {
  if (pageCount >= MAX_PAGES_BEFORE_RECYCLE) {
    await closeBrowserInternal();
    pageCount = 0;
  }
}

export async function withPage<T>(
  fn: (page: Page) => Promise<T>
): Promise<T> {
  await acquire();

  try {
    await recycleBrowserIfNeeded();
    const b = await getBrowserInternal();
    const page = await b.newPage();
    pageCount++;

    try {
      return await fn(page);
    } finally {
      await page.close();
    }
  } finally {
    release();
  }
}
