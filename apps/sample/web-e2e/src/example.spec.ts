import { test, expect } from '@playwright/test';

test('has the local greeting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Hello from browser/)).toBeVisible();
});

test('shows the backend greeting', async ({ page }) => {
  await page.goto('/');
  await page.route('**/api/greeting**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Hello, mocked!' }),
    })
  );
  await page.reload();
  await expect(page.getByTestId('backend-greeting')).toHaveText(
    'Hello, mocked!'
  );
});
