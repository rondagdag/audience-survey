# Audience Survey - AI Agent Instructions

## Architecture Overview

This is a Next.js 15 App Router application for collecting audience feedback via photo uploads. The core flow: **Attendee uploads survey photo → Azure AI extracts data → Live dashboard aggregates results**.

### Critical Data Flow Pattern
1. **Client upload** (`components/SurveyUploader.tsx`) → `/api/analyze`
2. **API route** converts image to Buffer → calls `AzureContentUnderstandingService`
3. **Azure response** → `SurveyMapper.mapToSurveyResult()` → structured `SurveyResult`
4. **DataStore** (in-memory singleton) → aggregation → `/api/summary` → dashboard

### State Architecture
- **Zustand stores** (`lib/store.ts`): Client-side state for sessions and uploads
- **DataStore singleton** (`lib/data-store.ts`): Server-side in-memory persistence
- **Pattern**: Stores poll APIs every 3-5 seconds for "live" updates (no WebSockets)

## Key Conventions

### Session Management (Critical Constraint)
- **Only ONE active session at a time** - enforced in `DataStore.createSession()`
- Creating new session auto-closes previous via `session.isActive = false`
- All uploads require `activeSession` check (see `SessionGuard` component)

### Environment Variables (Required for Testing)
```env
ADMIN_SECRET=demo-secret-123          # Required for /admin access
AZURE_CONTENT_ENDPOINT=https://...    # Optional - app works without Azure (returns mock data)
AZURE_CONTENT_KEY=your-key-here       # Optional
```
**Dev workflow**: Server restart required after `.env.local` changes

### Type System Patterns
- All survey data types in `lib/types.ts` - single source of truth
- `SurveyResult` has optional fields (`attendeeType?`, `aiLevel?`) for partial extractions
- `uncertain?: boolean` flag when Azure confidence < 0.7

## Common Development Tasks

### Adding New Survey Fields
1. Update types in `lib/types.ts` (e.g., add field to `PresentationFeedback`)
2. Extend `SurveyMapper.mapToSurveyResult()` with extraction logic
3. Update `DataStore.getSessionSummary()` for aggregation
4. Add visualization component in `components/`

### API Route Pattern (All follow this)
```typescript
// All API routes use this structure:
export async function POST(request: NextRequest) {
  try {
    const activeSession = dataStore.getActiveSession();
    if (!activeSession) return NextResponse.json({ error: '...' }, { status: 400 });
    
    // Business logic...
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: '...' }, { status: 500 });
  }
}
```

### Testing Without Azure
- App gracefully handles missing Azure credentials
- `AzureContentUnderstandingService` throws "not configured" error
- Caught in `/api/analyze` → returns user-friendly message
- For testing: Mock data can be added to `SurveyMapper` directly

## Build & Deploy

### Critical Build Commands
```bash
npm run build          # Requires Node 18+, validates TypeScript
npm run dev            # Dev server with hot reload
```

### Common Build Issues
- **Buffer type error**: Already fixed with `as unknown as BodyInit` cast in `azure-content-understanding.ts`
- **Missing types**: Run `npm install --save-dev @types/canvas-confetti` (already included)
- **Layout not found**: Ensure `app/layout.tsx` exists (must restart dev server after creation)

## Integration Points

### Azure AI Content Understanding
- **REST API**: `POST {endpoint}/contentunderstanding/documents:analyze?api-version=2024-12-01-preview`
- **Pattern**: Send raw Buffer, parse `analyzeResult.readResults` for OCR
- **Mapping logic**: Text extraction → keyword matching for survey fields (see `SurveyMapper.extractAttendeeType()`)

### Admin Authentication Flow
- **Client-side**: Form collects `adminSecret`, sets `isAuthenticated` state
- **Server-side**: All admin endpoints check `req.body.adminSecret === process.env.ADMIN_SECRET`
- **Pattern**: Secret sent with each request (stateless, no sessions)

## Codebase-Specific Patterns

### Component Organization
- **No barrel exports** - import directly from files
- **'use client' directive** on all interactive components (required for App Router)
- **Zustand hooks** must be called at component top level (React hooks rules)

### Data Store Singleton Pattern
```typescript
// lib/data-store.ts exports singleton:
export const dataStore = new DataStore();

// Used in API routes:
import { dataStore } from '@/lib/data-store';
const sessions = dataStore.getAllSessions();
```

### Real-time Updates (Pseudo-Live)
- No WebSockets - uses `setInterval` in `useEffect` hooks
- Admin dashboard: polls `/api/summary` every 5 seconds
- Session list: polls `/api/sessions` every 3 seconds
- Clear intervals in cleanup functions

## Testing

### Playwright E2E Tests
- **Location**: `tests/` directory (3 test suites)
- **Configuration**: `playwright.config.ts` - runs on Chromium, Firefox, WebKit, and mobile viewports
- **Auto-start**: Dev server automatically starts before tests via `webServer` config

### Test Suites
1. **admin.spec.ts**: Admin authentication, session CRUD, dashboard functionality
2. **audience.spec.ts**: Upload flow, SessionGuard, mobile responsiveness, file validation
3. **api.spec.ts**: Direct API testing (sessions, analyze, summary, export endpoints)

### Testing Patterns
```typescript
// Create session helper (use in beforeEach):
const adminPage = await context.newPage();
await adminPage.goto('/admin');
await adminPage.getByPlaceholder('Admin Secret').fill('demo-secret-123');
await adminPage.getByRole('button', { name: /login/i }).click();
await adminPage.getByPlaceholder(/session name/i).fill('Test Session');
await adminPage.getByRole('button', { name: /create session/i }).click();
await adminPage.close();

// Image upload helper:
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles({
  name: 'survey.png',
  mimeType: 'image/png',
  buffer: Buffer.from('base64-encoded-1x1-png', 'base64'),
});

// API testing pattern:
const response = await request.post('/api/sessions', {
  data: { name: 'Test', adminSecret: 'demo-secret-123' },
});
expect(response.ok()).toBeTruthy();
const data = await response.json();
expect(data.success).toBeTruthy();
```

### Running Tests
```bash
npm run test:e2e        # Headless mode (CI/CD)
npm run test:ui         # Interactive UI mode (development)
npm run test:headed     # Watch browser execution
npm run test:report     # View HTML report
```

### CI/CD Integration
- **GitHub Actions**: `.github/workflows/playwright.yml` runs tests on push/PR
- **Environment**: Creates `.env.local` with `ADMIN_SECRET=demo-secret-123` in CI
- **Artifacts**: Uploads test reports for 30 days retention

## Deployment Notes

- **Vercel**: Auto-detects Next.js, add env vars in dashboard
- **Azure Static Web Apps**: Use `staticwebapp.config.json` (already configured)
- **Production TODO**: Replace `DataStore` in-memory maps with database (maintain same interface)

---

**Quick verification**: Check `dataStore.getActiveSession()` before any upload/analysis operations. This is the #1 pattern throughout the codebase.
