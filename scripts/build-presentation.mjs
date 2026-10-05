import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1152, height: 648 },
  });
  await page.goto(pathToFileURL(resolve("docs/presentation.html")).href);
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts.ready);
  const overflowing = await page
    .locator("section")
    .evaluateAll((slides) =>
      slides
        .map((slide, index) => ({
          slide: index + 1,
          overflow: slide.scrollHeight > slide.clientHeight + 1,
        }))
        .filter((slide) => slide.overflow),
    );
  if (overflowing.length)
    throw new Error(
      `Slides exceed page height: ${overflowing.map((slide) => slide.slide).join(", ")}`,
    );
  await page.pdf({
    path: "docs/presentation.pdf",
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.log(
    `Built ${await page.locator("section").count()} slides: docs/presentation.pdf`,
  );
} finally {
  await browser.close();
}
