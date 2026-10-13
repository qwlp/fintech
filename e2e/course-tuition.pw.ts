import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`course choices fill tuition and reset across universities at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/course-planner?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/currency-budget-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto("/course-planner?currency=CNY");
    await page.getByRole("combobox", { name: "University estimates" }).click();
    await page
      .getByRole("option", { name: "Tsinghua University", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Course", exact: true }).click();
    await page.getByRole("option", { name: "Law", exact: true }).click();
    await expect(page.locator(".course-tuition-note")).toContainText("26,000");
    const back = page.locator(".planner-category-back");
    if (await back.isVisible()) await back.click();
    await page.getByRole("button", { name: "Tuition", exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: /Annual tuition/ }),
    ).toHaveAttribute("aria-valuenow", "26000");
    await page
      .getByRole("spinbutton", { name: /Annual tuition/ })
      .fill("25000");
    await page.getByRole("combobox", { name: "Degree level" }).click();
    await page
      .getByRole("option", { name: "Postgraduate", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Course", exact: true }).click();
    await page
      .getByRole("option", {
        name: "Advanced Computing (Master’s)",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("spinbutton", { name: /Annual tuition/ }),
    ).toHaveAttribute("aria-valuenow", "39000");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/course-tuition-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("combobox", { name: "University estimates" }).click();
    await page
      .getByRole("option", { name: "Peking University", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Course", exact: true }),
    ).toContainText("Choose your course");
    await expect(
      page.getByRole("spinbutton", { name: /Annual tuition/ }),
    ).toHaveValue("0");
  });
}
