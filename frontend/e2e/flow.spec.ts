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

test("AI-POT study locks an answer and reveals every choice keyword in place", async ({ page }, testInfo) => {
  await page.goto("/aipot");
  await expect(page.getByRole("heading", { name: /풀 세트 선택/ })).toBeVisible();
  await page.getByRole("link", { name: "세트 시작" }).first().click();
  await page.getByRole("button", { name: /이론 시험 시작/ }).click();
  await expect(page.getByText("이론 시험 · 실습으로 먼저 이동할 수 없습니다")).toBeVisible();
  await expect(page.locator("fieldset")).toHaveCount(5);
  await page.getByRole("radio").first().check();
  await expect(page.getByText("정답 해설")).toBeVisible();
  await expect(page.getByText("선택지 해설")).toHaveCount(3);
  await expect(page.getByText("모든 보기의 상세 해설")).toHaveCount(0);
  await expect(page.getByRole("radio").first()).toBeDisabled();
  await expectNoPageOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-aipot-feedback.png`), fullPage: true });
});

test("AI-POT lets learners restart any in-progress set from a confirmed dialog", async ({ page }) => {
  await page.goto("/aipot/solve/source-round-01");
  await expect(page.getByRole("button", { name: "시험 종료 및 답안 제출", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "현재 답안 제출", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /이론 시험 시작/ }).click();
  await page.getByRole("radio").first().check();

  const restart = page.getByRole("button", { name: "처음부터 다시 풀기", exact: true });
  await expect(restart).toBeVisible();
  await restart.click();

  const dialog = page.getByRole("dialog", { name: "이 세트를 처음부터 다시 풀까요?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "처음부터 다시 풀기", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "처음부터 다시 풀기", exact: true }).click();

  await expect(page.getByRole("button", { name: /이론 시험 시작/ })).toBeVisible();
  await expect(restart).not.toBeVisible();
  await page.getByRole("link", { name: "세트 선택" }).click();
  await expect(page.getByRole("heading", { name: /풀 세트 선택/ })).toBeVisible();
  await expect(page.getByText(/임시 답안/)).not.toBeVisible();
});
