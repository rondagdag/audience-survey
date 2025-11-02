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
    
    // Close any existing active session first
    const closeButton = page.getByRole('button', { name: /close session/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    
    // Wait for session name input to be visible
    const sessionNameInput = page.getByPlaceholder(/session name/i);
    await expect(sessionNameInput).toBeVisible({ timeout: 10000 });
    
    // Create session
    const sessionName = `Test Session ${Date.now()}`;
    await sessionNameInput.fill(sessionName);
    await page.getByRole('button', { name: /create session/i }).click();
    
    // Should see active session
    await expect(page.getByText(/active since/i)).toBeVisible();
    await expect(page.locator('.text-green-900', { hasText: sessionName }).first()).toBeVisible();
  });

  test('should close active session', async ({ page }) => {
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Close any existing active session first
    const closeButton = page.getByRole('button', { name: /close session/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    
    // Wait for session name input and create session
    const sessionNameInput = page.getByPlaceholder(/session name/i);
    await expect(sessionNameInput).toBeVisible({ timeout: 10000 });
    const sessionName = `Test Session ${Date.now()}`;
    await sessionNameInput.fill(sessionName);
    await page.getByRole('button', { name: /create session/i }).click();
    await expect(page.getByText(/active since/i)).toBeVisible();
    
    // Close session and wait for API response
    const sessionsPromise = page.waitForResponse(response => 
      response.url().includes('/api/sessions') && response.request().method() === 'GET'
    );
    await page.getByRole('button', { name: /close session/i }).click();
    await sessionsPromise;
    
    // Wait for UI to update
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/session name/i)).toBeVisible();
  });

  test('should display session summary with metrics', async ({ page }) => {
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for dashboard to load
    await expect(page.getByText(/session management/i)).toBeVisible();
    
    // Close any existing active session first
    const closeButton = page.getByRole('button', { name: /close session/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await expect(page.getByText(/no active session/i)).toBeVisible({ timeout: 5000 });
    }
    
    // Wait for session name input and create session
    const sessionNameInput = page.getByPlaceholder(/session name/i);
    await sessionNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await sessionNameInput.fill('Metrics Test Session');
    await page.getByRole('button', { name: /create session/i }).click();
    
    // Should show metrics section with zero submissions
    await expect(page.getByText(/0.*submission/i)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to audience view', async ({ page }) => {
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for dashboard to load
    await expect(page.getByText(/session management/i)).toBeVisible();
    
    // Find and click the back link (← Audience View)
    const audienceLink = page.locator('button, a').filter({ hasText: /audience view/i }).first();
    await audienceLink.waitFor({ state: 'visible', timeout: 5000 });
    await audienceLink.click();
    
    // Should navigate to main page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /audience survey/i })).toBeVisible();
  });
});

test.describe('Admin Dashboard - Session History', () => {
  test('should display session history', async ({ page }) => {
    await page.goto('/admin');
    
    // Login
    await page.getByPlaceholder('Admin Secret').fill('demo-secret-123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Close any existing active session first
    const closeButton = page.getByRole('button', { name: /close session/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Wait for session name input and create session
    const sessionNameInput = page.getByPlaceholder(/session name/i);
    await sessionNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await sessionNameInput.fill('History Test Session');
    await page.getByRole('button', { name: /create session/i }).click();
    await expect(page.getByText(/active since/i)).toBeVisible();
    
    // Close session and wait for API response
    const sessionsPromise = page.waitForResponse(response => 
      response.url().includes('/api/sessions') && response.request().method() === 'GET'
    );
    await page.getByRole('button', { name: /close session/i }).click();
    await sessionsPromise;
    
    // Wait for UI to update
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/session name/i)).toBeVisible();
    
    // Should show session history section
    await expect(page.getByText(/session history/i)).toBeVisible();
    await expect(page.getByText(/history test session/i).first()).toBeVisible();
  });
});
