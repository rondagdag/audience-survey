import { test, expect } from '@playwright/test';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'test';

test.describe('Audience View - No Active Session', () => {
  test('should show "no active session" message when no session exists', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /no active session/i })).toBeVisible();
    await expect(page.getByText(/please wait for the speaker to start/i)).toBeVisible();
  });

  test('should display header with app title', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /audience survey/i })).toBeVisible();
    await expect(page.getByText(/snap your survey.*instant insights/i)).toBeVisible();
  });
});

test.describe('Audience View - With Active Session', () => {
  test.beforeEach(async ({ page, context }) => {
    // Create a session via admin panel
    const adminPage = await context.newPage();
    await adminPage.goto('/admin');
    await adminPage.getByPlaceholder('Admin Secret').fill(ADMIN_SECRET);
    await adminPage.getByRole('button', { name: /login/i }).click();
    
    // Close any existing active session first
    const closeButton = adminPage.getByRole('button', { name: /close session/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const sessionsPromise = adminPage.waitForResponse(response => 
        response.url().includes('/api/sessions') && response.request().method() === 'GET'
      );
      await closeButton.click();
      await sessionsPromise;
      await adminPage.waitForTimeout(500);
    }
    
    // Wait for session name input and create session
    const sessionNameInput = adminPage.getByPlaceholder(/session name/i);
    await sessionNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await sessionNameInput.fill('Test Active Session');
    
    // Wait for session creation to complete
    const createSessionPromise = adminPage.waitForResponse(response => 
      response.url().includes('/api/sessions') && response.request().method() === 'POST'
    );
    await adminPage.getByRole('button', { name: /create session/i }).click();
    await createSessionPromise;
    await adminPage.waitForTimeout(500); // Wait for UI update
    await adminPage.close();
    
    // Navigate to audience view and wait for sessions to load
    const sessionsPromise = page.waitForResponse(response => 
      response.url().includes('/api/sessions') && response.request().method() === 'GET'
    );
    await page.goto('/');
    await sessionsPromise;
    await page.waitForTimeout(500); // Wait for React state update
  });

  test('should display active session indicator', async ({ page }) => {
    // Verify the active session badge appears
    await expect(page.getByText(/active session/i)).toBeVisible();
  });

  test('should show upload and summary tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /upload survey/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /view results/i })).toBeVisible();
  });

  test('should display upload interface on upload tab', async ({ page }) => {
    await page.getByRole('button', { name: /upload survey/i }).click();
    
    await expect(page.getByRole('heading', { name: /submit your feedback/i })).toBeVisible();
    await expect(page.getByText(/take photo of survey/i)).toBeVisible();
  });

  test('should switch to results tab', async ({ page }) => {
    await page.getByRole('button', { name: /view results/i }).click();
    
    await expect(page.getByRole('heading', { name: /results dashboard/i })).toBeVisible();
    await expect(page.getByText(/speaker will display the live results/i)).toBeVisible();
  });

  test('should show file input when clicking upload button', async ({ page }) => {
    await page.getByRole('button', { name: /upload survey/i }).click();
    
    const uploadButton = page.getByText(/take photo of survey/i);
    await expect(uploadButton).toBeVisible();
    
    // Verify the button is clickable
    await expect(uploadButton).toBeEnabled();
  });
});

test.describe('Audience View - File Upload Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Create active session
    const adminPage = await context.newPage();
    await adminPage.goto('/admin');
    await adminPage.getByPlaceholder('Admin Secret').fill(ADMIN_SECRET);
    await adminPage.getByRole('button', { name: /login/i }).click();
    
    // Close any existing active session first
    const closeButton = adminPage.getByRole('button', { name: /close session/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await adminPage.waitForTimeout(500);
    }
    
    // Wait for session name input and create session
    const sessionNameInput = adminPage.getByPlaceholder(/session name/i);
    await sessionNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await sessionNameInput.fill('Upload Test Session');
    await adminPage.getByRole('button', { name: /create session/i }).click();
    await adminPage.waitForTimeout(1000);
    await adminPage.close();
    
    await page.goto('/');
  });

  test('should show error for invalid file type', async ({ page }) => {
    await page.getByRole('button', { name: /upload survey/i }).click();
    
    // Create a text file to simulate wrong file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('test content'),
    });
    
    // Should show error message
    await expect(page.getByText(/please select an image file/i)).toBeVisible();
  });

  test('should show preview after selecting valid image', async ({ page }) => {
    await page.getByRole('button', { name: /upload survey/i }).click();
    
    // Upload a valid image (1x1 PNG)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'survey.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    });
    
    // Should show image preview and action buttons
    await expect(page.locator('img[alt="Survey preview"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /retake/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit survey/i })).toBeVisible();
  });

  test('should allow retaking photo', async ({ page }) => {
    await page.getByRole('button', { name: /upload survey/i }).click();
    
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'survey.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    });
    
    // Click retake
    await page.getByRole('button', { name: /retake/i }).click();
    
    // Should return to upload button
    await expect(page.getByText(/take photo of survey/i)).toBeVisible();
    await expect(page.locator('img[alt="Survey preview"]')).not.toBeVisible();
  });
});

test.describe('Audience View - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should be mobile-friendly', async ({ page }) => {
    await page.goto('/');
    
    // Header should be visible
    await expect(page.getByRole('heading', { name: /audience survey/i })).toBeVisible();
    
    // Content should be readable without horizontal scroll
    const body = page.locator('body');
    const boundingBox = await body.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });

  test('should show mobile-optimized upload button', async ({ page, context }) => {
    // Create session
    const adminPage = await context.newPage();
    await adminPage.goto('/admin');
    await adminPage.getByPlaceholder('Admin Secret').fill(ADMIN_SECRET);
    await adminPage.getByRole('button', { name: /login/i }).click();
    
    // Close any existing active session first
    const closeButton = adminPage.getByRole('button', { name: /close session/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await adminPage.waitForTimeout(500);
    }
    
    // Wait for session name input and create session
    const sessionNameInput = adminPage.getByPlaceholder(/session name/i);
    await sessionNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await sessionNameInput.fill('Mobile Test Session');
    await adminPage.getByRole('button', { name: /create session/i }).click();
    await adminPage.waitForTimeout(1000);
    await adminPage.close();
    
    await page.goto('/');
    await page.getByRole('button', { name: /upload survey/i }).click();
    
    // Upload button should be large and touch-friendly
    const uploadButton = page.getByText(/take photo of survey/i);
    const buttonBox = await uploadButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(20); // Should be visible and tappable
  });
});
