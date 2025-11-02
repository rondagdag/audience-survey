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

- Node.js 18+ and npm
- Azure subscription with AI Content Understanding resource
- (Optional) Vercel account for deployment

## � Project Structure

```
audience-survey/
├── app/                  # Next.js application
│   ├── src/              # Source code
│   │   ├── app/          # App Router pages and API routes
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and business logic
│   ├── tests/            # Playwright E2E tests
│   ├── public/           # Static assets
│   └── ...               # Config files (package.json, tsconfig.json, etc.)
├── iac/                  # Infrastructure as Code (Terraform)
├── setup/                # Setup scripts
├── docs/                 # Documentation
│   ├── QUICKSTART.md     # Quick setup guide
│   ├── AZURE_INTEGRATION.md  # Azure setup details
│   ├── ANALYZER_SCHEMA.md    # Custom analyzer schema
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

## 📦 Deployment

### Deploy to Vercel:

```bash
cd app
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard:
- `AZURE_CONTENT_ENDPOINT`
- `AZURE_CONTENT_KEY`
- `AZURE_ANALYZER_ID`
- `ADMIN_SECRET`

### Deploy to Azure Static Web Apps:

```bash
cd app

# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Build
npm run build

# Deploy (follow prompts)
swa deploy
```

For infrastructure deployment, see [iac/README.md](iac/README.md).

## 🛠️ Development

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
│       ├── azure-content-understanding.ts  # Azure integration
│       └── survey-mapper.ts  # AI result mapping
├── tests/                # Playwright E2E tests
├── public/               # Static assets
└── ...                   # Config files
```

### Testing

### Available Commands

From the `app/` directory:

```bash
npm run dev       # Start dev server with Turbopack
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

### Testing

Run end-to-end tests with Playwright:

```bash
cd app

# Run all tests (headless)
npm run test:e2e

# Run tests in UI mode (recommended for development)
npm run test:ui

# Run tests in headed mode (watch browser)
npm run test:headed

# View HTML test report
npm run test:report
```

Test suites:
- **admin.spec.ts**: Admin authentication, session management
- **audience.spec.ts**: Upload flow, mobile responsiveness
- **api.spec.ts**: API endpoints, validation, error handling

Tests automatically start the dev server if not running. For details, see [TESTING.md](docs/TESTING.md).

### Adding Features

The codebase is structured for easy extension:

- Add new survey fields in `src/lib/types.ts`
- Extend mapping logic in `src/lib/survey-mapper.ts`
- Create new visualizations in `src/components/`
- Add API endpoints in `src/app/api/`

### Data Storage

Currently uses in-memory storage (resets on server restart). Uploaded images are saved to `data/uploads/` directory with timestamps and preserved for reference.

For production:

1. Replace `app/src/lib/data-store.ts` with database integration (MongoDB, PostgreSQL, etc.)
2. Update API routes to use the new data layer
3. Maintain the same interface for minimal code changes
4. Consider cloud storage (Azure Blob Storage, AWS S3) for uploaded images

See [BLOB_STORAGE.md](docs/BLOB_STORAGE.md) for storage implementation details.

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

### "Couldn't read survey" error:
- Ensure good lighting when taking photo
- Keep survey flat and in focus
- Make sure text is clearly visible
- Try taking photo from directly above

### Azure API errors:
- Verify endpoint URL format: `https://<name>.services.ai.azure.com/`
  - Azure AI Services endpoint (not legacy cognitiveservices.azure.com)
- Check API key is correct (from AI Services resource)
- Ensure resource is in supported region (westus, swedencentral, australiaeast)
- Confirm subscription has available quota
- If using AI Foundry Project, verify connection to AI Services is active

### No active session:
- Admin must create a session from `/admin` page
- Only one session can be active at a time
- Session must be explicitly closed before creating new one

---

**Ready to collect instant feedback? Start your session now! 📊✨**
