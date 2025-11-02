# Azure Blob Storage Integration

## Overview

Uploaded survey images are now stored in **Azure Blob Storage** instead of the local file system. This provides scalable, secure, and persistent cloud storage for uploaded images.

## Architecture

### BlobStorageService (`lib/blob-storage.ts`)

Central service for managing blob storage operations:

**Key Features:**
- Uploads image buffers to Azure Blob Storage
- Generates unique blob names: `<timestamp>-<uuid>.<ext>`
- Returns full blob URL for storage in database
- Supports both connection string (local dev) and managed identity (production)
- Automatic container creation if not exists
- Image deletion capability

**Authentication Methods:**
1. **Local Development**: Connection string via `AZURE_STORAGE_CONNECTION_STRING`
2. **Production**: Managed identity via `AZURE_STORAGE_ACCOUNT_NAME` + DefaultAzureCredential

### Modified Files

#### 1. `lib/blob-storage.ts` (NEW)
- `BlobStorageService` class with upload/delete methods
- Connection string and managed identity support
- Unique blob naming with timestamp + UUID
- Error handling for blob operations

#### 2. `app/api/analyze/route.ts`
**Before:** Saved images to `data/uploads/` directory
```typescript
const filePath = path.join(uploadsDir, fileName);
await fs.writeFile(filePath, buffer);
savedImagePath = filePath;
```

**After:** Uploads to Azure Blob Storage
```typescript
const blobService = new BlobStorageService();
const uploadResult = await blobService.uploadImage(buffer, file.name, file.type);
blobUrl = uploadResult.blobUrl;
```

#### 3. `lib/types.ts`
Updated `SurveyResult.imagePath` comment:
- **Before:** "Optional server-side path to the original uploaded image"
- **After:** "Azure Blob Storage URL to the original uploaded image"

#### 4. Environment Variables
Added to `.env.local` and `.example.env.local`:
```env
# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=your-connection-string-here
# AZURE_STORAGE_ACCOUNT_NAME=your-account-name  # For managed identity
AZURE_STORAGE_CONTAINER_NAME=uploads
```

#### 5. Terraform Configuration
**`iac/main.tf`:**
- Storage account and container already provisioned
- Added storage env vars to App Service app settings:
  - `AZURE_STORAGE_ACCOUNT_NAME`
  - `AZURE_STORAGE_CONTAINER_NAME`
- App Service has `Storage Blob Data Contributor` role via managed identity

**`iac/outputs.tf`:**
- Added storage variables to `environment_variables` output
- Updated deployment instructions with storage config

#### 6. Documentation
Updated `.github/copilot-instructions.md`:
- Blob Storage Pattern section
- Environment variables documentation
- Authentication strategy notes

## Dependencies

Installed Azure Storage SDK packages:
```json
{
  "@azure/storage-blob": "^12.x",
  "@azure/identity": "^4.x"
}
```

## Local Development Setup

1. **Get your storage connection string** from Azure Portal or Terraform output:
   ```bash
   terraform output -raw storage_account_connection_string
   ```

2. **Update `.env.local`**:
   ```env
   AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
   AZURE_STORAGE_CONTAINER_NAME=uploads
   ```

3. **Restart development server** (required for env var changes):
   ```bash
   npm run dev
   ```

## Production Deployment

The Terraform configuration automatically:
1. Creates storage account with `uploads` container
2. Grants App Service managed identity `Storage Blob Data Contributor` role
3. Sets `AZURE_STORAGE_ACCOUNT_NAME` in App Service settings
4. No connection string needed - uses managed identity via DefaultAzureCredential

## Blob Storage Details

### Blob Naming Convention
- Format: `<timestamp>-<uuid>.<ext>`
- Example: `1730476396000-a1b2c3d4-5e6f-7890-abcd-ef1234567890.jpg`
- Guarantees uniqueness and allows chronological sorting

### Container Configuration
- Name: `uploads` (configurable via `AZURE_STORAGE_CONTAINER_NAME`)
- Access: Private (no public access)
- Created automatically if doesn't exist

### Error Handling
- Missing env vars: "Azure Storage is not configured" error
- Upload failures: Returns 500 with "Failed to upload image to storage"
- Container auto-creation failures: Caught and logged

### Security
- **Local dev**: Connection string stored in `.env.local` (gitignored)
- **Production**: Managed identity with RBAC (no secrets in code)
- **TLS**: HTTPS only (`https_traffic_only_enabled = true` in Terraform)
- **Access**: Private containers, App Service has minimal required permissions

## Data Migration Notes

**Important:** Existing local images in `data/uploads/` are NOT automatically migrated.

To access old images:
1. They remain in `data/uploads/` directory
2. `SurveyResult.imagePath` for old records contains local file paths
3. New uploads will have blob URLs in `imagePath`

You can identify blob URLs vs local paths:
```typescript
const isBlobUrl = imagePath?.startsWith('https://');
```

## Testing

Type checking passes:
```bash
npx tsc --noEmit  # ✓ No errors
```

To test blob storage integration:
1. Upload a survey via `/` route
2. Check Azure Portal → Storage Account → Containers → uploads
3. Verify blob appears with correct timestamp-UUID naming
4. Check CSV export includes blob URL in `imagePath` column

## Rollback

If needed, revert to local storage by:
1. Restore `app/api/analyze/route.ts` to use `fs.writeFile`
2. Remove blob storage env vars
3. Remove `lib/blob-storage.ts`
4. Uninstall `@azure/storage-blob` and `@azure/identity`
