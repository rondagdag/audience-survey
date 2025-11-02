# Audience Survey - AI Agent Instructions

## Architecture Overview

Next.js 16 App Router application for real-time audience feedback collection via photo uploads. **Core flow**: Attendee uploads survey photo → Azure AI Content Understanding extracts structured data → Live dashboard aggregates results.

### Critical Data Flow
1. **Client** (`SurveyUploader`) → POST `/api/analyze` with FormData
2. **API route** converts File to Buffer → **saves to `data/uploads/`** (persistent storage) → `AzureContentUnderstandingService.analyzeImage()`
3. **Azure REST API** (2-step): POST to start analysis → poll `operation-location` until status='succeeded'
4. **Azure response** → `SurveyMapper.mapToSurveyResult()` → structured `SurveyResult` (includes `imagePath`)
5. **DataStore singleton** persists → aggregation in `getSessionSummary()` → `/api/summary` → dashboard

### File Upload & Storage Pattern
- Uploaded images saved to `data/uploads/<timestamp>-<uuid>.<ext>` before processing
- `SurveyResult.imagePath` stores absolute file path for later reference
- CSV export includes `imagePath` as first column for traceability
- File save errors return 500 with "Failed to save uploaded image"
- Creates `data/uploads` directory recursively if missing (`fs.mkdir(uploadsDir, { recursive: true })`)

### State Management Architecture
- **Client**: Zustand stores (`lib/store.ts`) - `useSessionStore()` for sessions, `useUploadStore()` for upload state
- **Server**: `DataStore` singleton (`lib/data-store.ts`) - in-memory Maps (sessions, surveyResults)
- **Sync pattern**: Client polls APIs every 3-5 seconds (no WebSockets) - intervals cleared in useEffect cleanup

### Zustand Store Patterns
**`useSessionStore()`** - Global session state across admin and audience views:
- `activeSession` - Currently active session (null if none)
- `sessions` - Full session list (sorted newest first)
- `fetchSessions()` - Polls `/api/sessions` to sync with server
- Used in: Admin dashboard, SessionGuard, audience header

**`useUploadStore()`** - Upload flow state (local to SurveyUploader):
- `isUploading` - Shows loading spinner during analysis
- `uploadResult` - Holds SurveyResult after success (triggers confetti)
- `uploadError` - Stores error message for display
- `resetUpload()` - Clears all upload state after timeout

**Store usage rules**:
- Always call hooks at component top level (React rules)
- Use `fetchSessions()` in useEffect with cleanup: `return () => clearInterval(interval)`
- Never mutate store state directly - use provided setters
- Upload store is ephemeral (3s auto-reset), session store persists

## Critical Constraints

### Session Management (Singleton Pattern)
- **ONE active session at a time** - `DataStore.createSession()` auto-closes previous sessions
- All upload operations MUST check `dataStore.getActiveSession()` first - returns 400 if null
- `SessionGuard` component blocks UI when no active session (shows "⏳ No Active Session")

### Admin Authentication
- **Login flow**: Admin enters secret → creates test session to verify credentials → closes test session
- All admin API routes check `adminSecret === process.env.ADMIN_SECRET` (401 if invalid)
- Client logs out automatically on 401 responses from session operations

### Environment Variables
```env
# Azure AI Content Understanding Configuration
AZURE_CONTENT_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/  # REQUIRED
AZURE_CONTENT_KEY=your-api-key-here                                              # REQUIRED
AZURE_ANALYZER_ID=audience-survey                                                # REQUIRED - Custom analyzer name

# Admin Secret for Session Management
ADMIN_SECRET=your-secure-admin-secret-here                                       # REQUIRED - protects /admin routes
```
⚠️ **Dev workflow**: Must restart server after `.env.local` changes
⚠️ **Setup**: Copy `.example.env.local` to `.env.local` and fill in your credentials

## Development Patterns

### Adding Survey Fields (4-step process)
1. **Types** (`lib/types.ts`): Add field to `PresentationFeedback` or `SurveyResult`
2. **Mapper** (`lib/survey-mapper.ts`): Extract from Azure `fields` object in `mapToSurveyResult()`
3. **Aggregation** (`lib/data-store.ts`): Update `getSessionSummary()` to calculate averages/counts
4. **Visualization** (`components/`): Create component (examples: `FeedbackChart`, `NpsStrip`, `WordCloud`)

### API Route Standard Pattern
```typescript
// CRITICAL: Add to routes that need fresh data on every request
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const activeSession = dataStore.getActiveSession();
    if (!activeSession) {
      return NextResponse.json({ success: false, error: '...' }, { status: 400 });
    }
    
    // Admin routes: verify adminSecret
    const { adminSecret } = await request.json();
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Business logic...
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: '...' }, { status: 500 });
  }
}
```

**Next.js 16 App Router specifics**:
- Use `export const dynamic = 'force-dynamic'` for routes that need real-time data (`/api/sessions`, `/api/summary`, `/api/export`)
- Without it, responses may be cached unexpectedly in production
- Admin secret verification pattern: GET endpoints use query params (`searchParams.get('adminSecret')`), POST/PATCH use request body

### Keyword Extraction Algorithm (Recent Update)
`DataStore.extractTopWords()` now extracts **meaningful keywords + phrases**:
- **Bigrams**: Captures 2-word phrases ("azure ai", "machine learning") with 1.5x weight boost
- **Stop words**: Expanded to 100+ words (includes "very", "really", "just", "about", etc.)
- **Filtering**: Removes numbers, <4 char words, words already in bigrams
- **Output**: Up to 15 high-frequency phrases + 35 unique keywords (top 50 total)

### Component Conventions
- **'use client'** directive on ALL interactive components (Next.js App Router requirement)
- **No barrel exports** - always import directly: `import X from '@/components/X'`
- **Zustand hooks** must be at component top level (React rules)
- **Polling cleanup**: Always clear intervals in useEffect return function

### Mobile Camera Optimization (SurveyUploader)
**Critical patterns for camera capture**:
```typescript
// Native camera on mobile devices
<input 
  type="file" 
  accept="image/*" 
  capture="environment"  // Rear camera preferred
  className="hidden"     // Trigger via styled button
/>
```

**File handling flow**:
1. User taps camera button → triggers hidden file input
2. `handleFileSelect()` validates type/size immediately (10MB max)
3. FileReader creates base64 preview → shows in UI
4. User confirms → `handleUpload()` converts preview back to blob
5. FormData upload to `/api/analyze` with original filename hint

**UX patterns**:
- Large touch target (60px+ height) for mobile
- Preview before submit (Retake vs Submit buttons)
- Loading spinner during upload (disable buttons)
- Confetti on success (`canvas-confetti` library, y: 0.6 origin)
- Context-aware error messages (session vs image quality)
- 3-second auto-dismiss for success state

**Mobile-specific considerations**:
- Images may be large (multi-MB photos) - validate size before upload
- Network may be slow - show clear loading state
- Portrait orientation common - test responsive layouts at 375px width

### Azure Integration Specifics
- **API version**: `2025-05-01-preview` (custom analyzers)
- **Polling**: Default 2s interval, 120s timeout
- **Custom analyzer**: Must be created in Azure AI Studio with field schema matching `lib/types.ts`
- **Error handling**: Throws "not configured" if env vars missing → caught in API route → user-friendly message
- **Buffer casting**: `imageBuffer as unknown as BodyInit` to satisfy TypeScript (required for Next.js)
- **Error narrowing**: Azure errors are `unknown` type; cast to `(azureError as any)?.message` to access properties safely

**Test structure**: 3 suites in `tests/` - `admin.spec.ts` (auth, session CRUD), `audience.spec.ts` (upload flow, mobile), `api.spec.ts` (endpoint validation). Dev server auto-starts via `playwright.config.ts` webServer config.

### Playwright Test Patterns (Project-Specific)
**Test organization**:
- `admin.spec.ts` - Admin auth flow, session lifecycle, 401 handling, CSV export
- `audience.spec.ts` - Upload UI, mobile viewport, SessionGuard blocking, confetti animation
- `api.spec.ts` - Raw endpoint validation, error codes, admin secret checks

**Common patterns in this project**:
```typescript
// Admin auth helper (reused across admin tests)
await page.goto('/admin');
await page.fill('input[type="password"]', process.env.ADMIN_SECRET!);
await page.click('button:has-text("Login")');

// Session creation pattern
await page.fill('input[placeholder*="session"]', 'Test Session');
await page.click('button:has-text("Create Session")');
await expect(page.locator('text=Test Session')).toBeVisible();

// Mobile upload test (viewport set in test)
await page.setViewportSize({ width: 375, height: 667 });
await page.locator('input[type="file"]').setInputFiles('test-survey.jpg');
```

**Key assertions**:
- Active session indicator: `expect(page.locator('text=Active Session')).toBeVisible()`
- Upload success: `expect(page.locator('text=Thank you')).toBeVisible()`
- Error states: `expect(page.locator('.bg-red-50')).toContainText('...')`
- CSV download: Check response headers for `Content-Type: text/csv`

### Development
```bash
npm install              # Install dependencies first
npm run dev              # Start dev server with Turbopack (Next.js 16)
npm run build            # Production build (validates TypeScript)
npm run start            # Start production server
npm run lint             # Run ESLint for code quality checks
```

### Testing (Playwright)
```bash
npm run test:e2e         # Headless CI mode
npm run test:ui          # Interactive UI (recommended for dev)
npm run test:headed      # Watch browser execution
npm run test:report      # View HTML report from last run
```

**Test structure**: 3 suites in `tests/` - `admin.spec.ts` (auth, session CRUD), `audience.spec.ts` (upload flow, mobile), `api.spec.ts` (endpoint validation). Dev server auto-starts via `playwright.config.ts` webServer config.

### Common Issues
- **Port conflict**: Check for existing Next.js instance on port 3000
- **Azure 401**: Verify `AZURE_CONTENT_KEY` is correct and resource exists
- **Session not detected**: Client polls every 5s - wait or refresh page
- **Tailwind not updating**: Restart dev server after config changes

## Error Message Patterns

### Context-Aware User Feedback
- **Session errors**: Show refresh instruction, not image quality tips
- **Azure errors**: "Couldn't read survey" instead of raw API error
- **Auth errors**: Automatically log out admin + show "expired" message

Example from `SurveyUploader`:
```typescript
{error.includes('session') ? (
  <p>Please refresh the page or contact the speaker to ensure a session is active.</p>
) : (
  <p>Try taking the photo in better lighting or with a clearer angle.</p>
)}
```

## Data Store Patterns

### In-Memory Storage (Production Warning)
Current `DataStore` uses Maps - **resets on server restart**. For production:
1. Replace Maps with database client (MongoDB, PostgreSQL, etc.)
2. Keep same interface: `createSession()`, `getSurveyResults()`, `getSessionSummary()`, etc.
3. Update only `lib/data-store.ts` - zero changes to API routes
4. **Image files** (`data/uploads`) persist to disk but references in DataStore are in-memory only

### Singleton Export Pattern
```typescript
// lib/data-store.ts
export const dataStore = new DataStore();

// All API routes import singleton
import { dataStore } from '@/lib/data-store';
const summary = dataStore.getSessionSummary(sessionId);
```

### CSV Export Pattern
- First column is `imagePath` for tracing uploaded images
- Strings escaped with double quotes: `"${String(cell).replace(/"/g, '""')}"`
- Returns plain CSV with Content-Type header for browser download
- Filename format: `session-<sessionId>-<timestamp>.csv`

## Deployment

- **Vercel**: Auto-detects Next.js - add env vars in dashboard
- **Azure Static Web Apps**: `staticwebapp.config.json` configured - use `swa` CLI
- **Required env vars**: `ADMIN_SECRET`, `AZURE_CONTENT_ENDPOINT`, `AZURE_CONTENT_KEY`, `AZURE_ANALYZER_ID`

---

**Critical pattern**: Always verify `dataStore.getActiveSession()` before ANY upload/analysis operation. Single active session is enforced at data layer.
