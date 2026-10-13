import { expect, test } from "@playwright/test";

for (const width of [390, 768, 800, 824, 900, 1024, 1280, 1440]) {
  test(`planner controls fit beside navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 954 });
    await page.route("**/responsive-planner?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="${width === 900 ? "dark" : "light"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>@media(min-width:801px){main.app-clean{margin-left:248px!important;margin-right:0!important}}</style></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/currency-budget-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto("/responsive-planner?currency=CNY");
    await page.getByRole("combobox", { name: "University estimates" }).click();
    await page
      .getByRole("option", { name: "Peking University", exact: true })
      .click();
    // Narrow workspaces use the same category drill-down as phones.
    const back = page.locator(".planner-category-back");
    if (await back.isVisible()) await back.click();
    await page.getByRole("button", { name: "Flights", exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: /One-way flight/ }),
    ).toBeVisible();
    await expect(page.locator(".move-alternatives article")).toHaveCount(3);
    const problems = await page.locator("#move-planner").evaluate((planner) => {
      const issues: string[] = [];
      const inside = (parent: Element, child: Element) => {
        const outer = parent.getBoundingClientRect();
        const inner = child.getBoundingClientRect();
        if (
          inner.left < outer.left - 1 ||
          inner.right > outer.right + 1 ||
          inner.top < outer.top - 1 ||
          inner.bottom > outer.bottom + 1
        )
          issues.push(
            `${child.className || child.tagName} escapes ${parent.className}`,
          );
      };
      for (const row of planner.querySelectorAll(
        ".move-alternatives article",
      )) {
        for (const child of row.children) inside(row, child);
        const children = [...row.children].map((el) =>
          el.getBoundingClientRect(),
        );
        for (let i = 0; i < children.length; i++) {
          for (let j = i + 1; j < children.length; j++) {
            const a = children[i],
              b = children[j];
            if (
              a.left < b.right - 1 &&
              b.left < a.right - 1 &&
              a.top < b.bottom - 1 &&
              b.top < a.bottom - 1
            )
              issues.push("estimate content overlaps");
          }
        }
      }
      for (const row of planner.querySelectorAll(".move-fields .move-field"))
        for (const child of row.children) inside(row, child);
      if (document.documentElement.scrollWidth > innerWidth)
        issues.push("page overflows horizontally");
      return issues;
    });
    expect(problems).toEqual([]);
    await page.locator(".planner-save-bar").scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: /Save move plan/ }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/planner-responsive-${width}.png`,
      fullPage: true,
    });
  });
}
