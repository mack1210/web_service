import { expect, test, type Page } from "@playwright/test";

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test("collection-detail-action flow preserves a usable context", async ({ page }, testInfo) => {
  await page.goto("/items?q=inventory");
  await expect(page.getByRole("heading", { name: /Find an item/i })).toBeVisible();
  await expectNoPageOverflow(page);
  await expect(page.getByRole("heading", { name: /Inventory reconciliation/i })).toBeVisible();
  await page.getByRole("link", { name: /Inventory reconciliation/i }).click();
  await expect(page.getByRole("heading", { name: /Representative action/i })).toBeVisible();
  const validate = page.getByRole("button", { name: "Validate input" });
  if (testInfo.project.name === "mobile-chromium") {
    await validate.focus();
    await page.keyboard.press("Enter");
  } else {
    await validate.click();
  }
  const confirm = page.getByRole("button", { name: "Run validation" });
  if (testInfo.project.name === "mobile-chromium") {
    await confirm.focus();
    await page.keyboard.press("Enter");
  } else {
    await confirm.click();
  }
  await expect(page.getByText("Validation succeeded")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/items\?q=inventory/);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-collection-flow.png`),
    fullPage: true,
  });
});

test("mobile navigation and theme controls are reachable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This interaction is mobile-specific.");
  await page.goto("/");
  await expectNoPageOverflow(page);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Collection", exact: true })
    .click();
  await expect(page).toHaveURL(/\/items/);
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-navigation.png`),
    fullPage: true,
  });
});

test("mobile overlays retain focus and restore the opener", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This interaction is mobile-specific.");
  await page.goto("/items");

  const filters = page.getByRole("button", { name: "Filters", exact: true });
  await filters.click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Done" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(filters).toBeFocused();

  await page.goto("/items/inventory-reconciliation");
  const validate = page.getByRole("button", { name: "Validate input" });
  await validate.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run validation" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(validate).toBeFocused();
});

test("a missing item presents a recoverable not-found state", async ({ page }) => {
  await page.goto("/items/missing");
  await expect(page.getByRole("heading", { name: "We could not find that item" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to collection" })).toHaveAttribute("href", "/items");
});
