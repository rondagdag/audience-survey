# Audience Survey - AI Agent Instructions

## Project Context

**Current Status**: Production deployment on Azure Container Apps with global CDN (Azure Front Door).

**Recent Changes** (November 2024):
- ✅ Deployed Azure Front Door Standard tier for global CDN (~40 min initial propagation)
- ✅ Verified cache working (x-cache headers present, 60-80% faster for repeat visits)
- ✅ Cost analysis complete: $100-150/month with CDN, $50-75 without
- ✅ Terraform state synced with live resources (use `terraform refresh` if drift occurs)

**Deployment URLs** (current):
- Production (CDN): `https://audsurvey-endpoint-l56h90-dndxawb5f3g2brb0.z03.azurefd.net`
- Direct (West US): `https://audsurvey-app-l56h90.thankfulwater-714ba05a.westus.azurecontainerapps.io`

**Key Design Decisions**:
1. **Singleton session pattern** - Only ONE active session at a time enforced at data layer
2. **In-memory storage** - DataStore uses Maps, resets on restart (ephemeral by design for demos)
3. **Blob storage first** - Images uploaded to Azure Blob before analysis (traceability via `imagePath`)
4. **Polling architecture** - Client polls APIs every 3-5 seconds (no WebSockets, simpler deployment)
5. **Managed identity** - Container Apps uses Azure AD for Storage/Key Vault (no connection strings in env)

## Project Structure

The project is organized as follows:
- **`app/`** - Next.js 16 application with App Router
  - **`src/`** - All source code (app/, components/, lib/)
  - **`tests/`** - Playwright E2E tests
  - **`public/`** - Static assets
- **`iac/`** - Terraform infrastructure as code
- **`setup/`** - Setup scripts (e.g., analyzer creation)
- **`docs/`** - Documentation files (all markdown except root README.md)

## Architecture Overview

Next.js 16 App Router application (in `app/` directory with `src/` folder structure) for real-time audience feedback collection via photo uploads. **Core flow**: Attendee uploads survey photo → Azure AI Content Understanding extracts structured data → Live dashboard aggregates results.

### Critical Data Flow
1. **Client** (`SurveyUploader`) → POST `/api/analyze` with FormData
2. **API route** converts File to Buffer → **uploads to Azure Blob Storage** → `AzureContentUnderstandingService.analyzeImage()`
3. **Azure REST API** (2-step): POST to start analysis → poll `operation-location` until status='succeeded'
4. **Azure response** → `SurveyMapper.mapToSurveyResult()` → structured `SurveyResult` (includes `imagePath` with blob URL)
5. **DataStore singleton** persists → aggregation in `getSessionSummary()` → `/api/summary` → dashboard

### Blob Storage Pattern
- Uploaded images stored in Azure Blob Storage (`BlobStorageService` in `src/lib/blob-storage.ts`)
- Blob naming: `<timestamp>-<uuid>.<ext>` (e.g., `1730476396000-a1b2c3d4.jpg`)
- `SurveyResult.imagePath` stores full blob URL for later reference (e.g., `https://account.blob.core.windows.net/uploads/...`)
- CSV export includes `imagePath` (blob URL) as first column for traceability
- Upload errors return 500 with "Failed to upload image to storage"
- Authentication: Connection string (local dev) or managed identity (production via DefaultAzureCredential)

### State Management Architecture
- **Client**: Zustand stores (`src/lib/store.ts`) - `useSessionStore()` for sessions, `useUploadStore()` for upload state
- **Server**: `DataStore` singleton (`src/lib/data-store.ts`) - in-memory Maps (sessions, surveyResults)
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
# Credentials from Azure AI Services resource (connected to AI Foundry Project)
AZURE_CONTENT_ENDPOINT=https://your-aiservices-name.services.ai.azure.com/      # REQUIRED
AZURE_CONTENT_KEY=your-api-key-here                                             # REQUIRED
AZURE_ANALYZER_ID=audience-survey                                               # REQUIRED - Custom analyzer name

# Azure Blob Storage Configuration (for uploaded images)
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string-here              # REQUIRED for local dev
# AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name                          # Alternative for managed identity in production
AZURE_STORAGE_CONTAINER_NAME=uploads                                             # OPTIONAL - defaults to "uploads"

# Admin Secret for Session Management
ADMIN_SECRET=your-secure-admin-secret-here                                       # REQUIRED - protects /admin routes
```
⚠️ **Dev workflow**: Must restart server after `.env.local` changes
⚠️ **Setup**: Copy `.example.env.local` to `.env.local` and fill in your credentials
⚠️ **Storage auth**: Use connection string for local dev, managed identity for production (via `AZURE_STORAGE_ACCOUNT_NAME`)

## Development Patterns

### Adding Survey Fields (4-step process)
1. **Types** (`src/lib/types.ts`): Add field to `PresentationFeedback` or `SurveyResult`
2. **Mapper** (`src/lib/survey-mapper.ts`): Extract from Azure `fields` object in `mapToSurveyResult()`
3. **Aggregation** (`src/lib/data-store.ts`): Update `getSessionSummary()` to calculate averages/counts
4. **Visualization** (`src/components/`): Create component (examples: `FeedbackChart`, `NpsStrip`, `WordCloud`)

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
- **No barrel exports** - always import directly: `import X from '@/components/X'` (@ maps to src/ directory)
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
- **Architecture**: Application → Azure AI Services (Content Understanding) ←→ AI Foundry Project (optional connection)
- **API version**: `2025-05-01-preview` (custom analyzers)
- **Endpoint format**: `https://<name>.services.ai.azure.com/` (AI Services, not legacy cognitiveservices domain)
- **Polling**: Default 2s interval, 120s timeout
- **Custom analyzer**: Must be created in Azure AI Studio with field schema matching `src/lib/types.ts`
- **AI Foundry Project**: Infrastructure includes Hub + Project for advanced AI workflows (agent development, model fine-tuning, etc.)
- **Connection**: AI Services can be connected to AI Foundry Project via Azure Portal for unified management
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
3. Update only `src/lib/data-store.ts` - zero changes to API routes
4. **Image files** (`data/uploads`) persist to disk but references in DataStore are in-memory only

### Singleton Export Pattern
```typescript
// src/lib/data-store.ts
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

### Azure Container Apps (Production - Recommended)
**Current deployment**: Azure Container Apps with Azure Front Door CDN for global performance.

**Infrastructure components** (managed via Terraform in `iac/`):
- **Container Apps**: 0.5 vCPU, 1GB RAM, West US region, 1-2 replicas
- **Azure Front Door**: Standard tier CDN with 118+ global PoPs (adds ~$50-75/month)
- **Container Registry**: Basic tier for Docker images
- **Storage Account**: Standard LRS for survey images
- **AI Services**: S0 tier for Content Understanding
- **Key Vault**: Secrets management with managed identity access

**Deployment URLs**:
- **Front Door CDN** (global): `https://audsurvey-endpoint-<suffix>-<hash>.z03.azurefd.net`
- **Direct URL** (West US): `https://audsurvey-app-<suffix>.thankfulwater-<hash>.westus.azurecontainerapps.io`
- Use Front Door for production traffic (50-100ms TTFB for global users with cache)
- Direct URL for debugging/testing only

**GitHub Actions workflow** (`.github/workflows/deploy.yml`):
```bash
# Triggered on push to main or manual dispatch
# 1. Builds Docker image tagged with commit SHA
# 2. Pushes to ACR (audsurveyacrl56h90.azurecr.io)
# 3. Updates Container App with new image + env vars from Key Vault
# 4. Runs Playwright E2E tests against deployed URL
```

**Manual deployment** (requires `az login`):
```bash
# Get Terraform outputs first
cd iac
ACR=$(terraform output -raw acr_login_server)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
CONTAINER_APP=$(terraform output -raw container_app_name)

# Build and push image
cd ../app
TAG=$(git rev-parse --short HEAD)
docker build -t "$ACR/audsurvey/web:$TAG" .
az acr login --name ${ACR%%.*}
docker push "$ACR/audsurvey/web:$TAG"

# Update Container App
az containerapp update \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --image "$ACR/audsurvey/web:$TAG"
```

**Terraform commands**:
```bash
cd iac
terraform init                    # Initialize providers
terraform plan -out=tfplan        # Preview changes
terraform apply tfplan            # Apply infrastructure changes
terraform refresh                 # Sync state with Azure (CRITICAL after manual Azure Portal changes)
terraform output                  # View all output values
terraform destroy                 # Delete all resources (use with caution)
```

**Container App specifics**:
- Health check: `/` endpoint (must return 200 OK)
- Port: 3000 (Next.js default)
- Image format: `<acr>.azurecr.io/audsurvey/web:<tag>`
- Environment variables loaded from Key Vault secrets via managed identity
- Managed identity has roles: `AcrPull`, `Storage Blob Data Contributor`, `Key Vault Secrets User`

**Azure Front Door patterns**:
- **First deployment**: Takes 15-45 minutes for global propagation (shows "NotStarted" → "Succeeded")
- **Cache behavior**: Ignores `utm_*` query params, compresses js/css/html/json
- **Health probes**: Every 100 seconds to Container App origin
- **Headers**: Look for `x-cache: TCP_HIT` (cached), `TCP_MISS` (origin fetch), `TCP_REMOTE_HIT` (PoP cache)
- **Debugging**: Use `curl -I <url>` to check cache headers, `az afd endpoint show` for propagation status

**Cost breakdown** (monthly estimates):
- **With Front Door**: $100-150/month
  - Front Door Standard: $50-75
  - Container Apps: $25-35
  - AI Services: $10-30
  - Storage + ACR + Logs + Key Vault: $10-15
- **Without Front Door**: $50-75/month (remove Front Door resources from Terraform)
- **Light usage**: Scale down to 0.25 vCPU, min replicas = 0 (-$12/month)
- **Heavy usage**: Scale up to 1 vCPU, max replicas = 5 (+$30/month)

**Cost optimization**:
```bash
# Remove Front Door (saves ~$55/month, lose global CDN)
cd iac
terraform destroy -target=azurerm_cdn_frontdoor_profile.main
terraform apply  # Update state

# Scale down Container Apps (saves ~$12/month)
# Edit iac/variables.tf: container_cpu = "0.25", container_memory = "0.5Gi"
terraform apply
```

### Alternative Deployments
- **Vercel**: Auto-detects Next.js - add env vars in dashboard (Free tier available)
- **Azure Static Web Apps**: `staticwebapp.config.json` configured - use `swa` CLI

**Required env vars** (all deployments):
- `ADMIN_SECRET` - Admin authentication secret (from Key Vault or manual)
- `AZURE_CONTENT_ENDPOINT` - AI Services endpoint (format: `https://<name>.services.ai.azure.com/`)
- `AZURE_CONTENT_KEY` - AI Services API key
- `AZURE_ANALYZER_ID` - Custom analyzer name (default: `audience-survey`)
- `AZURE_STORAGE_ACCOUNT_NAME` - Storage account name (for managed identity) OR
- `AZURE_STORAGE_CONNECTION_STRING` - Connection string (for local dev/Vercel)
- `AZURE_STORAGE_CONTAINER_NAME` - Blob container name (default: `uploads`)

## Troubleshooting Production Issues

### Terraform State Drift
**Problem**: Terraform state shows old revision (e.g., `--0000002`) but actual revision is `--0000010`
```bash
cd iac
terraform refresh  # CRITICAL: Syncs state with actual Azure resources
terraform show     # Verify state is current
```

### 404 on Container App URL
**Causes**:
1. Using revision-specific URL (e.g., `audsurvey-app-l56h90--0000002.thankfulwater-...`) - these expire
2. Outdated Terraform state - run `terraform refresh`
3. Container stopped - check `az containerapp show` for `runningState`

**Solution**: Always use main FQDN without revision suffix

### Front Door Not Loading
**Symptoms**: Requests pending/timeout on Front Door URL, direct URL works
**Causes**:
1. Initial global propagation (15-45 minutes after first `terraform apply`)
2. Origin health probe failing (check Container App `/` returns 200)
3. DNS propagation delays

**Debug steps**:
```bash
# Check Front Door deployment status
az afd endpoint show \
  --profile-name <profile-name> \
  --resource-group rg-audience-survey \
  --endpoint-name <endpoint-name> \
  --query "deploymentStatus"
# Wait for "Succeeded" (not "NotStarted")

# Test cache headers
curl -I https://audsurvey-endpoint-<suffix>.z03.azurefd.net
# Look for: x-cache header (TCP_HIT = cached, TCP_MISS = origin)

# Verify origin is healthy
curl -I https://audsurvey-app-<suffix>.thankfulwater-<hash>.westus.azurecontainerapps.io
# Must return 200 OK
```

### Session Not Found After Restart
**Cause**: In-memory `DataStore` resets on server restart (ephemeral storage)
**Solution**: Export CSV before maintenance windows, or migrate to persistent database (MongoDB/PostgreSQL)

### High Latency for Global Users
**Without CDN**: 400-500ms TTFB from Philippines to West US
**With CDN** (Front Door):
- First request: 400-500ms (cache miss)
- Cached requests: 50-100ms (served from Manila/Singapore PoP)
- Cache TTL: Respects origin Cache-Control headers

---

**Critical pattern**: Always verify `dataStore.getActiveSession()` before ANY upload/analysis operation. Single active session is enforced at data layer.
