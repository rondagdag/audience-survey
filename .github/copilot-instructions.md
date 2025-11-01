# Audience Survey - AI Agent Instructions

## Architecture Overview

Next.js 15 App Router application for real-time audience feedback collection via photo uploads. **Core flow**: Attendee uploads survey photo → Azure AI Content Understanding extracts structured data → Live dashboard aggregates results.

### Critical Data Flow
1. **Client** (`SurveyUploader`) → POST `/api/analyze` with FormData
2. **API route** converts File to Buffer → `AzureContentUnderstandingService.analyzeImage()`
3. **Azure REST API** (2-step): POST to start analysis → poll `operation-location` until status='succeeded'
4. **Azure response** → `SurveyMapper.mapToSurveyResult()` → structured `SurveyResult`
5. **DataStore singleton** persists → aggregation in `getSessionSummary()` → `/api/summary` → dashboard

### State Management Architecture
- **Client**: Zustand stores (`lib/store.ts`) - `useSessionStore()` for sessions, `useUploadStore()` for upload state
- **Server**: `DataStore` singleton (`lib/data-store.ts`) - in-memory Maps (sessions, surveyResults)
- **Sync pattern**: Client polls APIs every 3-5 seconds (no WebSockets) - intervals cleared in useEffect cleanup

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
ADMIN_SECRET=demo-secret-123                        # REQUIRED - protects /admin routes
AZURE_CONTENT_ENDPOINT=https://...azure.com/        # Optional - app degrades gracefully
AZURE_CONTENT_KEY=your-key                          # Optional
AZURE_ANALYZER_ID=audience-survey                   # Custom analyzer name
```
⚠️ **Dev workflow**: Must restart server after `.env.local` changes

## Development Patterns

### Adding Survey Fields (4-step process)
1. **Types** (`lib/types.ts`): Add field to `PresentationFeedback` or `SurveyResult`
2. **Mapper** (`lib/survey-mapper.ts`): Extract from Azure `fields` object in `mapToSurveyResult()`
3. **Aggregation** (`lib/data-store.ts`): Update `getSessionSummary()` to calculate averages/counts
4. **Visualization** (`components/`): Create component (examples: `FeedbackChart`, `NpsStrip`, `WordCloud`)

### API Route Standard Pattern
```typescript
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

### Azure Integration Specifics
- **API version**: `2025-05-01-preview` (custom analyzers)
- **Polling**: Default 2s interval, 120s timeout
- **Custom analyzer**: Must be created in Azure AI Studio with field schema matching `lib/types.ts`
- **Error handling**: Throws "not configured" if env vars missing → caught in API route → user-friendly message
- **Buffer casting**: `imageBuffer as unknown as BodyInit` to satisfy TypeScript (required for Next.js)

## Build & Test Commands

### Development
```bash
npm run dev              # Turbopack enabled for faster builds (Next.js 16)
npm run build            # Production build (validates TypeScript)
npm run start            # Start production server
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

### Singleton Export Pattern
```typescript
// lib/data-store.ts
export const dataStore = new DataStore();

// All API routes import singleton
import { dataStore } from '@/lib/data-store';
const summary = dataStore.getSessionSummary(sessionId);
```

## Deployment

- **Vercel**: Auto-detects Next.js - add env vars in dashboard
- **Azure Static Web Apps**: `staticwebapp.config.json` configured - use `swa` CLI
- **Required env vars**: `ADMIN_SECRET`, `AZURE_CONTENT_ENDPOINT`, `AZURE_CONTENT_KEY`, `AZURE_ANALYZER_ID`

---

**Critical pattern**: Always verify `dataStore.getActiveSession()` before ANY upload/analysis operation. Single active session is enforced at data layer.
