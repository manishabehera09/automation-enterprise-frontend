import { test, expect } from "@playwright/test";

test.describe("SecureGate AI Workflow: Visitor -> Employee -> Admin", () => {
  test("complete end-to-end visitor check-in workflow", async ({ page }) => {
    // 1. Visitor Login
    await page.goto("http://localhost:5173");
    await page.click("text=Login");
    
    // Wait for AuthPortal to render and the visitor profile button to be available
    await page.waitForSelector("button:has-text('visitor Profile')");
    await page.click("button:has-text('visitor Profile')");
    await page.click("button:has-text('Sign In to SecureGate')");
    
    await expect(page.locator("text=SecureGate AI Visitor Portal")).toBeVisible();

    // 2. Create Visitor Request
    await page.click("button:has-text('New Booking')");
    await page.fill("input[placeholder='E.g. Partner, Vendor']", "E2E Test Corp");
    await page.fill("input[placeholder='Name of host employee']", "Employee Tester");
    await page.click("button:has-text('Submit Registration')");
    
    // Wait for success toast or some indicator
    await page.waitForTimeout(1000);
    
    // 3. Logout Visitor
    await page.click("button:has-text('Sign Out')");

    // 4. Employee Login
    await page.click("text=Login");
    await page.waitForSelector("button:has-text('employee Profile')");
    await page.click("button:has-text('employee Profile')");
    await page.click("button:has-text('Sign In to SecureGate')");
    await expect(page.locator("text=My Visitors")).toBeVisible();

    // 5. Approve Request
    await page.waitForTimeout(1000);
    const auditBtn = page.locator("button:has-text('Audit')").first();
    
    if (await auditBtn.isVisible()) {
      await auditBtn.click();
      
      const approveBtn = page.locator("button:has-text('Approve')").first();
      await approveBtn.waitFor({ state: "visible" });
      await approveBtn.click();
      
      await page.waitForTimeout(1000);
    }
    
    // 6. Logout Employee
    await page.click("button:has-text('Sign Out')");

    // 7. Admin Login
    await page.click("text=Login");
    await page.waitForSelector("button:has-text('admin Profile')");
    await page.click("button:has-text('admin Profile')");
    await page.click("button:has-text('Sign In to SecureGate')");
    await expect(page.locator("text=Control Center")).toBeVisible();

    // 8. Verify Audit Logs
    await page.click("button:has-text('Audit Logs')");
    await page.waitForTimeout(1000);
    
    // Ensure we can see the audit log stream table
    await expect(page.locator("text=Immutable Audit Log Stream")).toBeVisible();
  });
});
