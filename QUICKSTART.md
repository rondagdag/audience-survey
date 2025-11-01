# Quick Start Guide

## ✅ Prerequisites Check

Before starting, ensure you have:
- [x] Node.js 18+ installed
- [ ] Azure AI Content Understanding resource created
- [ ] Azure endpoint and API key ready

## 🚀 Setup Steps

### 1. Install Dependencies

Already done! ✓

### 2. Configure Environment Variables

Create `.env.local` in the root directory:

```bash
# Copy from example
cp .env.local.example .env.local
```

Then edit `.env.local` and add your credentials:

```env
AZURE_CONTENT_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com
AZURE_CONTENT_KEY=your-api-key-here
ADMIN_SECRET=your-secure-random-string-here
```

**Important:** Replace the placeholder values with your actual Azure credentials and generate a strong admin secret.

### 3. Create Azure AI Content Understanding Resource

If you haven't created an Azure resource yet:

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "AI Content Understanding"
4. Fill in the required details:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Region**: Choose closest to your audience
   - **Name**: Choose a unique name
   - **Pricing Tier**: Select appropriate tier
5. Click "Review + Create" → "Create"
6. Once deployed, go to "Keys and Endpoint"
7. Copy:
   - **Endpoint**: Looks like `https://your-name.cognitiveservices.azure.com`
   - **Key 1** or **Key 2**: Your API key

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 5. Test the Application

#### As a Speaker (Admin):

1. Go to http://localhost:3000/admin
2. Enter your `ADMIN_SECRET` value
3. Create a new session (e.g., "Test Session - Nov 2025")
4. Leave this tab open

#### As an Attendee:

1. Open http://localhost:3000 in a new tab/window
2. You should see the active session indicator
3. Print the `SURVEY_TEMPLATE.md` file, fill it out, and take a photo
   - OR use any sample survey image
4. Upload the photo
5. See the confetti! 🎉

#### Check Results:

1. Go back to the admin tab
2. You should see live results updating
3. Try exporting the CSV

## 📋 Print Survey Forms

Before your presentation:

1. Open `SURVEY_TEMPLATE.md`
2. Print enough copies for your audience
3. Bring them to your session

## 🔍 Troubleshooting

### Build Issues

If you see any errors:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Azure API Issues

- **401 Unauthorized**: Check your API key
- **404 Not Found**: Verify your endpoint URL
- **429 Rate Limit**: Your quota is exceeded, wait or upgrade tier
- **"Not configured"**: Make sure `.env.local` exists with correct values

### No Active Session

- Admin must create a session from `/admin`
- Only one session can be active at a time
- Check that you're using the correct admin secret

## 🚀 Deployment

### To Vercel (Recommended):

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

### To Azure Static Web Apps:

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Build
npm run build

# Deploy
swa deploy
```

## 📝 Next Steps

1. **Customize the Survey**: Edit `lib/survey-mapper.ts` to match your survey format
2. **Add Persistence**: Replace `lib/data-store.ts` with a database (MongoDB, PostgreSQL, etc.)
3. **Add Analytics**: Integrate with Application Insights or Google Analytics
4. **Customize Styling**: Update Tailwind classes in components
5. **Add Authentication**: Implement OAuth or Azure AD for admin access

## 🎯 Production Checklist

Before going live:

- [ ] Set strong admin secret (use password generator)
- [ ] Add rate limiting middleware
- [ ] Set up HTTPS (automatic on Vercel/Azure)
- [ ] Test with real survey forms
- [ ] Configure database for persistence
- [ ] Set up monitoring and logging
- [ ] Test mobile camera upload
- [ ] Verify Azure AI quota is sufficient
- [ ] Create backup of survey forms
- [ ] Test session creation/closing flow

## 💡 Tips for Success

- **Test Beforehand**: Upload a few test surveys before your presentation
- **Good Lighting**: Remind attendees to take photos in good lighting
- **Clear Instructions**: Show example of good survey photo on first slide
- **QR Code**: Generate QR code to your app URL for easy access
- **Backup Plan**: Have a few extra printed surveys
- **Live Demo**: Show the dashboard at the end of your session

---

**Ready to go? Start with `npm run dev` and create your first session!** 🚀
