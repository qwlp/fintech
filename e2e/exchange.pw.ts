import { expect, test } from "@playwright/test";
for (const width of [320,390,1440]) {
 test(`exchange conversion and alert at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:1000});
  await page.route("**/exchange-preview",r=>r.fulfill({contentType:"text/html",body:`<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/exchange-preview.tsx";</script></body></html>`}));
  await page.goto("/exchange-preview");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page.getByLabel("Amount to convert").fill("1000");
  await expect(page.locator(".fx-result output")).toContainText("7,120.80");
  await expect(page.locator(".fx-total")).toContainText("1,008.40");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`/tmp/movewise-exchange-${width}.png`,fullPage:true});
  await page.locator(".fx-alert-disclosure summary").click();
  await page.getByLabel("Target rate · CNY per USD").fill("7.5");
  await page.getByRole("button",{name:"Create alert"}).click();
  await expect(page.locator(".fx-alert-disclosure [role=status]")).toHaveText("Alert saved.");
 });
}
