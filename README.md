# Audience Survey

**"Snap your survey → instant insights."**

A Next.js application for collecting and analyzing audience feedback during speaking sessions using Azure AI Content Understanding. Attendees upload photos of their completed survey forms, and the system automatically extracts and aggregates the data for live presentation.

## 🌟 Features

- **Mobile-First Upload**: Camera-optimized interface for quick survey photo capture
- **Azure AI Content Understanding**: Automatic extraction of checkboxes, numbers, and handwritten text via Azure AI Services
- **Azure AI Foundry Integration**: Connected to AI Foundry Project for advanced AI workflows
- **Live Dashboard**: Real-time feedback aggregation for speakers
- **Session Management**: Create and manage multiple feedback sessions
- **Rich Analytics**:
  - 5-point Likert scale visualization
  - Net Promoter Score (NPS) distribution
  - Word cloud from open feedback
  - Audience breakdown by type and experience level
- **CSV Export**: Download complete session data
- **Fun UX**: Confetti animation on successful submission

## 📋 Prerequisites

- **Node.js 20+** and npm
- **Azure Subscription** with permissions to create resources
- **Azure CLI** - [Install here](https://learn.microsoft.com/cli/azure/install-azure-cli)
- **(Optional) Terraform** - For infrastructure automation - [Install here](https://www.terraform.io/downloads)
- **(Optional) Docker** - For containerized deployment

## 📂 Project Structure

```
audience-survey/
├── app/                  # Next.js 16 application
│   ├── src/              # Source code
│   │   ├── app/          # App Router pages and API routes
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and business logic
│   ├── tests/            # Playwright E2E tests
│   ├── public/           # Static assets
│   ├── Dockerfile        # Container configuration
│   └── ...               # Config files (package.json, tsconfig.json, etc.)
├── iac/                  # Infrastructure as Code (Terraform)
│   ├── main.tf           # Main Terraform configuration
│   ├── variables.tf      # Variable definitions
│   ├── outputs.tf        # Output values
│   └── README.md         # Detailed IaC documentation
├── setup/                # Setup scripts
│   └── create-analyzer.sh # Custom analyzer creation script
├── docs/                 # Documentation
│   ├── QUICKSTART.md     # Quick setup guide
│   ├── AZURE_INTEGRATION.md  # Azure setup details
│   ├── ANALYZER_SCHEMA.md    # Custom analyzer schema
│   ├── BLOB_STORAGE.md   # Storage implementation details
│   ├── TESTING.md        # Testing guide
│   └── ...               # Additional documentation
└── README.md             # This file
```

## �🚀 Quick Start

### 1. Install Dependencies

```bash
cd app
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .example.env.local .env.local
```

Edit `.env.local` and add your credentials:

```env
# Azure AI Content Understanding
AZURE_CONTENT_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com//
AZURE_CONTENT_KEY=your-api-key-here
AZURE_ANALYZER_ID=audience-survey

# Admin Secret (use a strong random string)
ADMIN_SECRET=your-secure-admin-secret-here
```

⚠️ **Note**: You must restart the development server after changing `.env.local` for the changes to take effect.

#### Getting Azure Credentials:

**Option 1: Deploy with Terraform (Recommended)**

1. Follow the [Infrastructure as Code guide](../iac/README.md)
2. Terraform creates all required resources including:
   - Azure AI Services (for Content Understanding)
   - Azure AI Foundry Hub and Project
   - Storage, Key Vault, and App Service
3. Retrieve credentials from Terraform outputs

**Option 2: Manual Setup**

1. Go to [Azure Portal](https://portal.azure.com)
2. Create an **Azure AI Services** resource (not just "Content Understanding")
   - This provides Content Understanding + other AI capabilities
   - Note the endpoint format: `https://<name>.services.ai.azure.com/`
4. (Optional but recommended) Create Azure AI Foundry Hub and Project
   - Navigate to [Azure AI Studio](https://ai.azure.com)
   - Create a new Hub and Project
   - Connect your AI Services resource to the project
5. Navigate to AI Services → "Keys and Endpoint"
6. Copy the endpoint URL and one of the keys
7. Create a custom analyzer in Azure AI Studio
   - Go to your AI Services resource in [Azure AI Studio](https://ai.azure.com)
   - Create analyzer with ID: `audience-survey`
   - Configure fields per [ANALYZER_SCHEMA.md](docs/ANALYZER_SCHEMA.md)

For detailed setup instructions, see [QUICKSTART.md](docs/QUICKSTART.md).

### 3. Run Development Server

```bash
cd app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Usage

### For Speakers/Organizers:

1. Navigate to `/admin`
2. Enter your admin secret
3. Create a new session before your presentation
4. Share the main URL with attendees
5. Monitor live results during/after the session
6. Export data as CSV when complete
7. Close the session when finished

### For Attendees:

1. Navigate to the main URL (provided by speaker)
2. Wait for the session to be active
3. Take a clear photo of your completed survey form
4. Preview and submit
5. See confirmation with confetti!

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 16 (App Router with Turbopack), React 19, TypeScript
- **Styling**: Tailwind CSS, mobile-first responsive design
- **State Management**: Zustand
- **Charts**: Recharts
- **AI Processing**: Azure AI Services (Content Understanding API)
- **AI Platform**: Azure AI Foundry (Hub + Project for advanced AI workflows)
- **Deployment**: Vercel / Azure App Service / Azure Static Web Apps

### Key Components

- `SessionGuard` - Blocks access when no active session
- `SurveyUploader` - Camera/file input with preview
- `SurveyMapper` - Maps Azure output to survey model
- `FeedbackChart` - Visualizes 1-5 Likert scales
- `NpsStrip` - Shows 0-10 recommendation distribution
- `WordCloud` - Renders top feedback words

### API Routes

- `POST /api/sessions` - Create new session (requires admin secret)
- `PATCH /api/sessions` - Close active session (requires admin secret)
- `GET /api/sessions` - List all sessions
- `POST /api/analyze` - Upload and analyze survey image
- `GET /api/summary?sessionId=xxx` - Get session aggregated results
- `GET /api/export?sessionId=xxx&adminSecret=xxx` - Export CSV

## 🎨 Survey Format

The application expects surveys with these fields:

### Structured Data:
- **Attendee Type**: Student / Developer / Manager / Researcher / Hobbyist / Other
- **AI Experience Level**: Beginner / Intermediate / Advanced / Expert
- **Azure AI Usage**: Yes / No / Planning to

### Presentation Feedback (1-5 Likert):
- How engaging was the presentation?
- How clear was the content?
- Were the demos useful?
- Was it at the right level?
- Did you learn something new?

### Recommendation Score:
- 0-10 scale: How likely are you to recommend this session?

### Open Feedback:
- What was the best part?
- What could be improved?
- What topics would you like to see in the future?

## 🔒 Security

- Admin routes protected by shared secret
- File type and size validation (10MB max)
- Rate limiting recommended for production
- HTTPS required for production deployment
- Sensitive data stored in environment variables

## 📦 Cloud Deployment

### Option 1: Azure Container Apps with GitHub Actions (Recommended)

The project includes a complete CI/CD pipeline for Azure Container Apps:

**Setup:**

1. **Provision infrastructure with Terraform:**
   ```bash
   cd iac
   terraform init
   terraform apply
   ```

2. **Configure GitHub repository secrets:**
   - `AZURE_CLIENT_ID` - Service principal client ID
   - `AZURE_TENANT_ID` - Azure tenant ID
   - `AZURE_SUBSCRIPTION_ID` - Your subscription ID
   - `ADMIN_SECRET` - Admin secret for the application

3. **Push to main branch or manually trigger workflow:**
   ```bash
   git push origin main
   ```

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
- Provision infrastructure (if not exists)
- Build Docker image with commit SHA tag
- Push to Azure Container Registry
- Deploy to Azure Container Apps
- Run Playwright E2E tests against deployed URL

**Access deployed app:**
```bash
cd iac
terraform output container_app_url
```

See [iac/README.md](iac/README.md) for detailed infrastructure documentation.

### Option 2: Azure Container Apps (Manual)

**Build and push Docker image:**

```bash
cd app

# Login to Azure
az login

# Get ACR name from Terraform outputs
cd ../iac
ACR=$(terraform output -raw acr_login_server)
cd ../app

# Build and push
PROJECT=audsurvey
TAG=$(git rev-parse --short HEAD)
docker build -t "$ACR/$PROJECT/web:$TAG" .

az acr login --name ${ACR%%.*}
docker push "$ACR/$PROJECT/web:$TAG"
```

**Update Container App:**

```bash
cd ../iac
terraform apply -var="container_image_tag=$TAG" -auto-approve
```

### Option 3: Vercel

**Quick deploy:**

```bash
cd app
npm install -g vercel
vercel
```

**Configure environment variables in Vercel dashboard:**
- `AZURE_CONTENT_ENDPOINT` - Your AI Services endpoint
- `AZURE_CONTENT_KEY` - AI Services API key
- `AZURE_ANALYZER_ID` - Custom analyzer ID (`audience-survey`)
- `AZURE_STORAGE_CONNECTION_STRING` - Storage connection string
- `AZURE_STORAGE_CONTAINER_NAME` - Container name (`uploads`)
- `ADMIN_SECRET` - Admin authentication secret

**Or use Vercel CLI with env vars:**

```bash
vercel --env AZURE_CONTENT_ENDPOINT=https://... \
       --env AZURE_CONTENT_KEY=your-key \
       --env AZURE_ANALYZER_ID=audience-survey \
       --env AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https... \
       --env ADMIN_SECRET=your-secret
```

### Option 4: Azure Static Web Apps

**Deploy with SWA CLI:**

```bash
cd app

# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Build the application
npm run build

# Deploy (follow prompts for authentication)
swa deploy
```

**Configure environment variables in Azure Portal:**
- Navigate to Static Web App → Configuration
- Add the same environment variables as Vercel

**Note:** The `staticwebapp.config.json` is pre-configured for Next.js routing.

### Environment Variables Required for All Deployments

All cloud deployments require these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_CONTENT_ENDPOINT` | AI Services endpoint | `https://name.services.ai.azure.com/` |
| `AZURE_CONTENT_KEY` | AI Services API key | `abc123...` |
| `AZURE_ANALYZER_ID` | Custom analyzer ID | `audience-survey` |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage connection (local/dev) | `DefaultEndpointsProtocol=https;...` |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account (managed identity) | `storageaccountname` |
| `AZURE_STORAGE_CONTAINER_NAME` | Blob container name | `uploads` |
| `ADMIN_SECRET` | Admin authentication secret | Strong random string |

**Note:** Use `AZURE_STORAGE_CONNECTION_STRING` for Vercel/SWA. Container Apps uses managed identity with `AZURE_STORAGE_ACCOUNT_NAME`.

### Post-Deployment Verification

1. **Test the deployed application:**
   ```bash
   # Visit your deployment URL
   curl https://your-app-url.azurecontainerapps.io
   ```

2. **Create a test session:**
   - Navigate to `/admin`
   - Login with your `ADMIN_SECRET`
   - Create a test session

3. **Upload a test survey:**
   - Visit the main page
   - Upload a sample survey image
   - Verify Azure AI Content Understanding extracts data correctly

4. **Check logs:**
   ```bash
   # Container Apps
   az containerapp logs show \
     --resource-group <rg-name> \
     --name <app-name> \
     --follow
   
   # Vercel
   vercel logs <deployment-url>
   ```

### Cleanup Resources

**To delete all Azure resources and stop charges:**

```bash
cd iac
terraform destroy
```

⚠️ **Warning:** This permanently deletes all resources including uploaded images and secrets.

## 🛠️ Development Guide

### Application Architecture

The Next.js application in `app/` contains:

```
app/
├── src/
│   ├── app/              # App Router pages and API routes
│   │   ├── api/          # API routes
│   │   │   ├── analyze/  # Image analysis endpoint
│   │   │   ├── sessions/ # Session management
│   │   │   ├── summary/  # Aggregated results
│   │   │   └── export/   # CSV export
│   │   ├── admin/        # Speaker dashboard
│   │   └── page.tsx      # Main audience view
│   ├── components/       # React components
│   └── lib/              # Utilities and business logic
│       ├── types.ts      # TypeScript definitions
│       ├── store.ts      # Zustand state management
│       ├── data-store.ts # In-memory data storage
│       ├── blob-storage.ts # Azure Blob Storage integration
│       ├── azure-content-understanding.ts  # Azure AI integration
│       └── survey-mapper.ts  # AI result mapping
├── tests/                # Playwright E2E tests
├── public/               # Static assets
├── Dockerfile            # Container configuration
└── ...                   # Config files
```

### Adding Features

The codebase is structured for easy extension:

1. **Add new survey fields:**
   - Update `src/lib/types.ts` with new field definitions
   - Extend `src/lib/survey-mapper.ts` to extract from Azure response
   - Update `src/lib/data-store.ts` aggregation logic
   - Create visualization components in `src/components/`

2. **Add new API endpoints:**
   - Create route in `src/app/api/`
   - Follow existing patterns for admin authentication
   - Use `export const dynamic = 'force-dynamic'` for real-time data

3. **Add new visualizations:**
   - Create component in `src/components/`
   - Use Recharts for charts, Tailwind for styling
   - Import directly (no barrel exports): `import X from '@/components/X'`

### Data Storage

**Current Implementation:**
- **Session data**: In-memory Maps in `DataStore` singleton (resets on restart)
- **Image files**: Azure Blob Storage with unique blob names
- **Image references**: Blob URLs stored in `SurveyResult.imagePath`

**For Production:**
- Replace `app/src/lib/data-store.ts` with database (MongoDB, PostgreSQL, Cosmos DB)
- Keep same interface for minimal API route changes
- Images already in cloud storage (Azure Blob Storage)

See [docs/BLOB_STORAGE.md](docs/BLOB_STORAGE.md) for storage implementation details.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this for your own presentations and events!

## 🙏 Acknowledgments

- Built with Next.js and React
- Powered by Azure AI Content Understanding
- UI components styled with Tailwind CSS
- Charts by Recharts
- Confetti by canvas-confetti

## � Documentation

- **[QUICKSTART.md](docs/QUICKSTART.md)** - Quick setup guide
- **[AZURE_INTEGRATION.md](docs/AZURE_INTEGRATION.md)** - Azure services setup
- **[ANALYZER_SCHEMA.md](docs/ANALYZER_SCHEMA.md)** - Custom analyzer configuration
- **[TESTING.md](docs/TESTING.md)** - Testing guide with Playwright
- **[BLOB_STORAGE.md](docs/BLOB_STORAGE.md)** - Storage implementation details
- **[iac/README.md](iac/README.md)** - Infrastructure as Code with Terraform

## �📞 Support

For issues and questions:
- Check the [Azure AI Content Understanding documentation](https://learn.microsoft.com/azure/ai-services/content-understanding/)
- Review the documentation in the `docs/` folder
- Open an issue in the GitHub repository
- Review the troubleshooting section below

## 🔧 Troubleshooting

### Local Development Issues

**Port already in use (Error: listen EADDRINUSE :::3000)**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

**Environment variables not updating**
- Restart development server after changing `.env.local`
- Verify file is named `.env.local` not `.env.local.txt`
- Check file is in `app/` directory, not project root

**"Module not found" errors**
```bash
# Clear Next.js cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### Azure Configuration Issues

**"Couldn't read survey" / Image analysis errors:**
- **Image quality**: Ensure good lighting, keep survey flat and in focus
- **Custom analyzer**: Verify analyzer ID is `audience-survey` in `.env.local`
- **Analyzer not deployed**: Check Azure AI Studio for analyzer status
- **Field mismatch**: Ensure analyzer schema matches [docs/ANALYZER_SCHEMA.md](docs/ANALYZER_SCHEMA.md)

**Azure API authentication errors (401 Unauthorized):**
- Verify endpoint URL format: `https://<name>.services.ai.azure.com/`
  - Must be AI Services endpoint, not legacy `cognitiveservices.azure.com`
- Check API key is correct (from AI Services → Keys and Endpoint)
- Ensure key hasn't been regenerated in Azure Portal
- Try using Key 2 if Key 1 fails

**Region/availability errors (403 Forbidden):**
- Ensure resource is in supported region: `westus`, `swedencentral`, or `australiaeast`
- Verify subscription has available quota for AI Services
- Check Content Understanding is enabled in your region

**Storage errors ("Failed to upload image to storage"):**
- Verify `AZURE_STORAGE_CONNECTION_STRING` is correct
- Check storage account name matches in connection string
- Ensure `uploads` container exists (auto-created on first upload)
- For Container Apps: verify managed identity has `Storage Blob Data Contributor` role

### Session Management Issues

**No active session error:**
- Admin must create a session from `/admin` page
- Only one session can be active at a time
- Session must be explicitly closed before creating new one
- Check browser console for 401 errors (admin secret mismatch)

**Admin login fails:**
- Verify `ADMIN_SECRET` in `.env.local` matches your input
- No spaces or special characters causing encoding issues
- Try regenerating admin secret (update in both `.env.local` and deployment)

**Sessions not appearing in dashboard:**
- Client polls every 5 seconds - wait or refresh page
- Check browser Network tab for failed `/api/sessions` requests
- Verify server is running and accessible

### Deployment Issues

**Container build fails:**
```bash
# Test Docker build locally
cd app
docker build -t test-build .

# Check for missing dependencies
npm run build
```

**Terraform errors:**
```bash
# Custom subdomain already exists
# Solution: Change project_name in terraform.tfvars

# State lock errors
terraform force-unlock <lock-id>

# Provider version conflicts
terraform init -upgrade
```

**GitHub Actions deployment fails:**
- Verify all repository secrets are set correctly
- Check Azure service principal has required permissions
- Review workflow logs for specific error messages
- Ensure Terraform state is not corrupted

### Testing Issues

**Playwright tests failing:**
```bash
# Install browser dependencies
npx playwright install --with-deps

# Update Playwright
npm install -D @playwright/test@latest

# Run single test file for debugging
npm run test:headed -- tests/admin.spec.ts
```

**Tests timeout or hang:**
- Ensure dev server is not already running on port 3000
- Check `.env.local` is properly configured
- Increase timeout in `playwright.config.ts` if needed

### Performance Issues

**Slow image analysis:**
- Azure AI Content Understanding typical response: 2-5 seconds
- Check network latency to Azure region
- Ensure images are not excessively large (max 10MB)
- Consider image compression before upload

**Dashboard not updating:**
- Verify polling intervals in Zustand stores (default 3-5s)
- Check browser console for JavaScript errors
- Clear browser cache and reload

### Data Issues

**Uploaded images not persisting:**
- Images stored in Azure Blob Storage (check Azure Portal)
- In-memory session data resets on server restart
- Export CSV before restarting server in development

**CSV export empty or missing data:**
- Verify session has submitted surveys
- Check `sessionId` parameter in export URL
- Ensure `adminSecret` is correct

### Getting Help

If issues persist:

1. **Check logs:**
   ```bash
   # Local development
   Check terminal output
   
   # Container Apps
   az containerapp logs show --name <app-name> --resource-group <rg-name> --follow
   
   # Vercel
   vercel logs
   ```

2. **Enable debug mode:**
   Add to `.env.local`:
   ```env
   NODE_ENV=development
   ```

3. **Review documentation:**
   - [Azure AI Content Understanding Docs](https://learn.microsoft.com/azure/ai-services/content-understanding/)
   - [Next.js Documentation](https://nextjs.org/docs)
   - Project docs in `docs/` folder

4. **Open an issue:**
   Include: error messages, environment (OS, Node version), steps to reproduce

---

**Ready to collect instant feedback? Start your session now! 📊✨**
