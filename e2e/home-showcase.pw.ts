import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1280]) {
  test(`homepage demo adapts its navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#home");
    const demo = page.locator(".home-showcase-section .demo-window");
    await demo.scrollIntoViewIfNeeded();
    const navigation = demo.locator(".demo-sidebar");
    const content = demo.locator(".demo-main");
    const navBox = await navigation.boundingBox();
    const contentBox = await content.boundingBox();
    expect(navBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    if (width <= 800) {
      expect(navBox!.y).toBeGreaterThanOrEqual(
        contentBox!.y + contentBox!.height - 1,
      );
      await expect(demo.locator(".demo-mobile-brand")).toBeVisible();
      await expect(demo.getByRole("tablist")).toBeHidden();
    } else {
      expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(contentBox!.x + 1);
      await expect(demo.getByRole("tablist")).toBeVisible();
    }
    for (const name of ["Study budget", "Sponsors", "Payments"]) {
      await navigation.getByRole("button", { name, exact: true }).click();
      await expect(
        navigation.getByRole("button", { name, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        await content.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
    await demo.getByRole("button", { name: "Prepare sample payment" }).click();
    await expect(
      demo.getByRole("button", { name: "Sample payment prepared" }),
    ).toBeDisabled();
    await navigation
      .getByRole("button", { name: "Sponsors", exact: true })
      .click();
    await demo.getByRole("button", { name: "Add sample contribution" }).click();
    await expect(
      demo.getByRole("button", { name: "Contribution added" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390)
      await demo.screenshot({ path: "/tmp/movewise-home-demo-mobile.png" });
  });
}
