import { test, expect } from "@playwright/test";

test.describe("SecureGate AI Platform E2E Flows", () => {

  test("should load the landing page and navigate around sections", async ({ page }) => {
    // Navigate to local dev server
    await page.goto("http://localhost:5173");

    // Check title presence
    await expect(page.locator("text=SecureGate AI")).toBeVisible();

    // Check key landing page sections
    await expect(page.locator("text=Autonomous AI Agent Teams")).toBeVisible();
    
    // Check dark/light toggle exists
    const toggleBtn = page.locator("button:has-svg");
    await expect(toggleBtn).toBeDefined();
  });

  test("should load the login portal and allow role tab switching", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Click Login link in header
    await page.click("text=Login");

    // Ensure Auth portal loaded
    await expect(page.locator("text=Anti-Bot CAPTCHA Verification")).toBeVisible();

    // Switch to Employee role tab
    await page.click("button:has-text('employee')");
    await expect(page.locator("button:has-text('employee')")).toHaveClass(/bg-slate-100/);

    // Switch to Admin role tab
    await page.click("button:has-text('admin')");
    await expect(page.locator("button:has-text('admin')")).toHaveClass(/bg-slate-100/);
  });

  test("should autocomplete credentials using hackathon quick login presets", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.click("text=Login");

    // Click Administrator quick login preset
    await page.click("button:has-text('admin Profile')");

    // Verify email and password fields filled
    const emailVal = await page.locator("input[type='email']").inputValue();
    const pwdVal = await page.locator("input[type='password']").inputValue();

    expect(emailVal).toBe("admin@securegate.ai");
    expect(pwdVal).toBe("Admin@12345");
  });

});
