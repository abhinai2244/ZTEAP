import { test, expect } from '@playwright/test';

test.describe('ZTAP - End-to-End Zero-Trust Access Portal Flow', () => {
  test('Employee logs in, views device trust, and submits access request', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('ZTAP');

    // 2. Click Quick-Login for Employee
    await page.getByRole('button', { name: /Employee/i }).first().click();

    // 3. Submit Authentication Form
    await page.getByRole('button', { name: /Authenticate & Verify/i }).click();

    // 4. Verify Redirect to Employee Dashboard
    await page.waitForURL('/employee');
    await expect(page.locator('h1')).toContainText('Employee Access Portal');

    // 5. Verify Device Trust Cards are displayed
    await expect(page.getByText('John\'s Work Laptop')).toBeVisible();

    // 6. Click Request Application Access button
    await page.getByRole('button', { name: /Request Application Access/i }).click();

    // 7. Fill out Access Justification
    await page.locator('textarea').fill('Routine weekly sprint maintenance and database audit');

    // 8. Submit Request to Policy Engine
    await page.getByRole('button', { name: /Submit & Evaluate Access/i }).click();

    // 9. Verify Policy Decision and Risk Breakdown Modal opens
    await expect(page.getByText('Zero-Trust Evaluation Breakdown')).toBeVisible();
    await expect(page.getByText(/Decision:/i)).toBeVisible();
    await expect(page.getByText(/Risk Score:/i)).toBeVisible();
  });
});
