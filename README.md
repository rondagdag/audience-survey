# Audience Survey

**"Snap your survey → instant insights."**

A Next.js application for collecting and analyzing audience feedback during speaking sessions using Azure AI Content Understanding. Attendees upload photos of their completed survey forms, and the system automatically extracts and aggregates the data for live presentation.

## 🌟 Features

- **Mobile-First Upload**: Camera-optimized interface for quick survey photo capture
- **Azure AI Content Understanding**: Automatic extraction of checkboxes, numbers, and handwritten text
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

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your credentials:

```env
# Azure AI Content Understanding
AZURE_CONTENT_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com
AZURE_CONTENT_KEY=your-api-key-here

# Admin Secret (use a strong random string)
ADMIN_SECRET=your-secure-admin-secret-here
```

#### Getting Azure AI Content Understanding Credentials:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new "AI Content Understanding" resource
3. Navigate to "Keys and Endpoint" section
4. Copy the endpoint URL and one of the keys

### 3. Run Development Server

```bash
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

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, mobile-first responsive design
- **State Management**: Zustand
- **Charts**: Recharts
- **AI Processing**: Azure AI Content Understanding REST API
- **Deployment**: Vercel / Azure Static Web Apps

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
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard:
- `AZURE_CONTENT_ENDPOINT`
- `AZURE_CONTENT_KEY`
- `ADMIN_SECRET`

### Deploy to Azure Static Web Apps:

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Build
npm run build

# Deploy (follow prompts)
swa deploy
```

## 🛠️ Development

### Project Structure

```
audience-survey/
├── app/
│   ├── api/              # API routes
│   │   ├── analyze/      # Image analysis endpoint
│   │   ├── sessions/     # Session management
│   │   ├── summary/      # Aggregated results
│   │   └── export/       # CSV export
│   ├── admin/            # Speaker dashboard
│   └── page.tsx          # Main audience view
├── components/           # React components
├── lib/
│   ├── types.ts          # TypeScript definitions
│   ├── store.ts          # Zustand state management
│   ├── data-store.ts     # In-memory data storage
│   ├── azure-content-understanding.ts  # Azure integration
│   └── survey-mapper.ts  # AI result mapping
└── public/               # Static assets
```

### Adding Features

The codebase is structured for easy extension:

- Add new survey fields in `lib/types.ts`
- Extend mapping logic in `lib/survey-mapper.ts`
- Create new visualizations in `components/`
- Add API endpoints in `app/api/`

### Data Storage

Currently uses in-memory storage (resets on server restart). For production:

1. Replace `lib/data-store.ts` with database integration (MongoDB, PostgreSQL, etc.)
2. Update API routes to use the new data layer
3. Maintain the same interface for minimal code changes

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

## 📞 Support

For issues and questions:
- Check the [Azure AI Content Understanding documentation](https://learn.microsoft.com/azure/ai-services/content-understanding/)
- Open an issue in the GitHub repository
- Review the troubleshooting section below

## 🔧 Troubleshooting

### "Couldn't read survey" error:
- Ensure good lighting when taking photo
- Keep survey flat and in focus
- Make sure text is clearly visible
- Try taking photo from directly above

### Azure API errors:
- Verify endpoint URL format (should include https://)
- Check API key is correct
- Ensure resource is in supported region
- Confirm subscription has available quota

### No active session:
- Admin must create a session from `/admin` page
- Only one session can be active at a time
- Session must be explicitly closed before creating new one

---

**Ready to collect instant feedback? Start your session now! 📊✨**
