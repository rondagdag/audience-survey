# Testing Guide

## Overview

This project uses [Playwright](https://playwright.dev/) for end-to-end testing. Tests cover the complete user flows including admin authentication, session management, audience upload, and API endpoints.

## Test Suites

### 1. Admin Tests (`tests/admin.spec.ts`)
Tests the speaker/admin dashboard functionality:
- ✅ Login form display and validation
- ✅ Authentication with correct/incorrect secrets
- ✅ Session creation and management
- ✅ Session closing and history
- ✅ Navigation to audience view

### 2. Audience Tests (`tests/audience.spec.ts`)
Tests the attendee upload experience:
- ✅ "No active session" guard behavior
- ✅ Tab navigation (Upload/Results)
- ✅ File upload flow with preview
- ✅ Image validation (type, size)
- ✅ Retake photo functionality
- ✅ Mobile responsiveness

### 3. API Tests (`tests/api.spec.ts`)
Direct API endpoint testing:
- ✅ Sessions CRUD operations
- ✅ Admin authentication validation
- ✅ File upload and analysis endpoint
- ✅ Summary aggregation
- ✅ CSV export with authentication

## Running Tests

### Development Mode (Recommended)

```bash
# Interactive UI with time-travel debugging
npm run test:ui
```

This opens Playwright's UI where you can:
- Run individual tests or suites
- Watch tests execute in real-time
- Use time-travel debugging
- View traces and screenshots

### Headless Mode (CI/CD)

```bash
# Run all tests in all browsers
npm run test:e2e

# Run specific test file
npx playwright test tests/admin.spec.ts

# Run specific test by name
npx playwright test -g "should authenticate with correct admin secret"
```

### Headed Mode (Watch Browser)

```bash
# See browser execution in real-time
npm run test:headed
```

### View Test Reports

```bash
# Open HTML report from last run
npm run test:report
```

## Test Configuration

### Environment Variables
Tests require `.env.local` with:
```env
ADMIN_SECRET=demo-secret-123
AZURE_CONTENT_ENDPOINT=placeholder  # Optional - tests work without Azure
AZURE_CONTENT_KEY=placeholder       # Optional
```

### Browsers
Tests run on multiple browsers/viewports:
- Desktop: Chrome, Firefox, Safari
- Mobile: Pixel 5, iPhone 12

Configure in `playwright.config.ts`.

### Auto-start Dev Server
Playwright automatically starts the Next.js dev server before tests and shuts it down after. No manual server management needed!

## Writing New Tests

### Test Structure Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup (navigate, create sessions, etc.)
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange: Set up test conditions
    await page.getByRole('button', { name: /click me/i }).click();
    
    // Assert: Verify expected outcomes
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

### Useful Patterns

#### Create Admin Session
```typescript
const adminPage = await context.newPage();
await adminPage.goto('/admin');
await adminPage.getByPlaceholder('Admin Secret').fill('demo-secret-123');
await adminPage.getByRole('button', { name: /login/i }).click();
await adminPage.getByPlaceholder(/session name/i).fill('Test Session');
await adminPage.getByRole('button', { name: /create session/i }).click();
await adminPage.waitForTimeout(1000); // Wait for session creation
await adminPage.close();
```

#### Upload Test Image
```typescript
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles({
  name: 'survey.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
});
```

#### Test API Endpoints
```typescript
test('should create session via API', async ({ request }) => {
  const response = await request.post('/api/sessions', {
    data: {
      name: 'API Test Session',
      adminSecret: 'demo-secret-123',
    },
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.success).toBeTruthy();
});
```

## Debugging Tests

### Interactive Debugging
```bash
# Open test in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test tests/admin.spec.ts --debug
```

This opens:
- Browser with Playwright Inspector
- Step-through test execution
- Evaluate locators in real-time

### Screenshots and Traces
Failed tests automatically capture:
- Screenshots
- Full execution traces
- Console logs
- Network requests

View in HTML report: `npm run test:report`

### Console Output
```bash
# Verbose output
npx playwright test --reporter=list

# Show browser console logs
npx playwright test --reporter=line
```

## CI/CD Integration

Tests run automatically on GitHub Actions:
- Trigger: Push to `main`/`develop` or PR
- Environment: Ubuntu with all browsers
- Artifacts: Test reports uploaded for 30 days
- Workflow: `.github/workflows/playwright.yml`

### Manual CI Run
```bash
# Simulate CI environment locally
CI=1 npm run test:e2e
```

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill existing dev server
lsof -ti:3000 | xargs kill -9

# Or let Playwright start it automatically
```

### Tests Timing Out
- Increase timeout in `playwright.config.ts`: `timeout: 60000`
- Add explicit waits: `await page.waitForSelector('...')`
- Use `test.slow()` for known slow tests

### Flaky Tests
- Use `await expect(...).toBeVisible()` instead of manual waits
- Avoid `waitForTimeout` - use `waitForSelector` or `waitForResponse`
- Check network tab in trace viewer for race conditions

### Authentication Issues
- Verify `.env.local` exists with `ADMIN_SECRET=demo-secret-123`
- Restart dev server after env changes
- Check server logs for 401 errors

## Best Practices

1. **Use Accessible Locators**: Prefer `getByRole`, `getByLabel`, `getByPlaceholder` over CSS selectors
2. **Avoid Hard Waits**: Use `waitFor*` methods or auto-waiting with `expect`
3. **Test User Flows**: Focus on complete workflows, not implementation details
4. **Isolate Tests**: Use `beforeEach` for setup, ensure tests don't depend on each other
5. **Mobile Testing**: Always test critical flows on mobile viewports
6. **API Testing**: Validate both UI and API layers independently

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Locators Cheatsheet](https://playwright.dev/docs/locators)

## Next Steps

To extend testing coverage:
- [ ] Add visual regression tests with screenshots
- [ ] Test Azure AI integration with mock service
- [ ] Add accessibility (a11y) testing
- [ ] Test CSV export file contents
- [ ] Add performance benchmarks
- [ ] Test error boundaries and edge cases
