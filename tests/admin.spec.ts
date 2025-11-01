import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('should show login form when not authenticated', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin access/i })).toBeVisible();
    await expect(page.getByPlaceholder('Admin Secret')).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should authenticate with correct admin secret', async ({ page }) => {
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Should see speaker dashboard after login
    await expect(page.getByRole('heading', { name: /speaker dashboard/i })).toBeVisible();
    await expect(page.getByText(/session management/i)).toBeVisible();
  });

  test('should show error when admin secret is empty', async ({ page }) => {
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText(/please enter admin secret/i)).toBeVisible();
  });

  test('should create a new session', async ({ page }) => {
    // Login first
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for dashboard to load
    await expect(page.getByText(/session management/i)).toBeVisible();
    
    // Create session
    const sessionName = `Test Session ${Date.now()}`;
    await page.getByPlaceholder(/session name/i).fill(sessionName);
    await page.getByRole('button', { name: /create session/i }).click();
    
    // Should see active session
    await expect(page.getByText(sessionName)).toBeVisible();
    await expect(page.getByText(/active since/i)).toBeVisible();
  });

  test('should close active session', async ({ page }) => {
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Create session first
    const sessionName = `Test Session ${Date.now()}`;
    await page.getByPlaceholder(/session name/i).fill(sessionName);
    await page.getByRole('button', { name: /create session/i }).click();
    await expect(page.getByText(sessionName)).toBeVisible();
    
    // Close session
    await page.getByRole('button', { name: /close session/i }).click();
    
    // Should show "no active session" message
    await expect(page.getByText(/no active session/i)).toBeVisible();
  });

  test('should display session summary with metrics', async ({ page }) => {
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Create session
    await page.getByPlaceholder(/session name/i).fill('Metrics Test Session');
    await page.getByRole('button', { name: /create session/i }).click();
    
    // Should show metrics section with zero submissions
    await expect(page.getByText(/0.*submissions/i)).toBeVisible();
  });

  test('should navigate to audience view', async ({ page }) => {
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Click audience view link
    await page.getByRole('link', { name: /audience view/i }).click();
    
    // Should navigate to main page
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/audience survey/i)).toBeVisible();
  });
});

test.describe('Admin Dashboard - Session History', () => {
  test('should display session history', async ({ page }) => {
    await page.goto('/admin');
    
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Create and close a session to populate history
    await page.getByPlaceholder(/session name/i).fill('History Test Session');
    await page.getByRole('button', { name: /create session/i }).click();
    await page.getByRole('button', { name: /close session/i }).click();
    
    // Should show session history section
    await expect(page.getByText(/session history/i)).toBeVisible();
    await expect(page.getByText(/history test session/i)).toBeVisible();
  });
});
