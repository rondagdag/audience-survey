# Quick Start: Analyzer Setup

**Goal**: Create the custom `audience-survey` analyzer in Azure AI Content Understanding using the AI Foundry Project architecture.

## Prerequisites

✅ Azure infrastructure deployed (via Terraform)  
✅ AI Services resource: `audsurvey-aiservices-l56h90`  
✅ AI Foundry Project: `audsurvey-project-l56h90`  
✅ Schema file: `docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json`

## Method 1: Using the Shell Script (Fastest)

### Option A: Using Environment Variables (Recommended)

```bash
# Export credentials from Terraform
cd iac
export AZURE_CONTENT_ENDPOINT=$(terraform output -raw ai_services_endpoint)
export AZURE_CONTENT_KEY=$(terraform output -raw ai_services_key)
export AZURE_ANALYZER_ID="audience-survey"

# Return to project root and run script
cd ..
./create-analyzer.sh
```

### Option B: Using Command Line Parameters

```bash
# Get credentials
cd iac
ENDPOINT=$(terraform output -raw ai_services_endpoint)
API_KEY=$(terraform output -raw ai_services_key)

# Run script with parameters
cd ..
./create-analyzer.sh "$ENDPOINT" "$API_KEY" "audience-survey"
```

### Option C: Set Environment Variables Manually

```bash
# Set environment variables
export AZURE_CONTENT_ENDPOINT="https://audsurvey-aiservices-l56h90.services.ai.azure.com"
export AZURE_CONTENT_KEY="your-api-key-here"
export AZURE_ANALYZER_ID="audience-survey"

# Run script
./create-analyzer.sh
```

### Step 4: Verify Success

Look for:
- ✅ HTTP 201 = Created successfully
- ✅ HTTP 200 = Already exists (updated)
- ❌ HTTP 401 = Invalid API key
- ❌ HTTP 400 = Schema error

## Method 2: Via Azure AI Studio Portal

### Step 1: Open AI Studio

Navigate to: https://ai.azure.com

### Step 2: Find Your AI Services Resource

1. Go to **All resources**
2. Find: `audsurvey-aiservices-l56h90`
3. Click to open

### Step 3: Create Analyzer

1. In left menu, find **Content Understanding** or **Analyzers**
2. Click **+ Create analyzer**
3. Enter name: `audience-survey`
4. Select **Custom field extraction**
5. Click **Upload schema** or **Paste JSON**
6. Upload: `docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json`
7. Click **Create**

### Step 4: Wait for Deployment

The analyzer will be deployed automatically (usually takes 1-2 minutes).

## Method 3: Via Azure CLI

### Prerequisites

```bash
az extension add -n ml
az login
```

### Create Analyzer

```bash
# Get resource details from Terraform
cd iac
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
AI_SERVICES_NAME=$(terraform output -raw ai_services_name)

# Return to project root
cd ..

# Create analyzer with schema file
az cognitiveservices account deployment create \
  --resource-group $RESOURCE_GROUP \
  --name $AI_SERVICES_NAME \
  --deployment-name audience-survey \
  --model-name content-understanding \
  --model-version "2025-05-01-preview" \
  --model-format ContentUnderstanding \
  --sku-capacity 1 \
  --sku-name Standard
```

## Verifying the Analyzer

### Option 1: Test via Shell Script

Create a test script:

```bash
#!/bin/bash
ENDPOINT="https://audsurvey-aiservices-l56h90.services.ai.azure.com"
API_KEY="your-api-key-here"
ANALYZER_ID="audience-survey"

# Get analyzer details
curl -X GET "${ENDPOINT}/contentunderstanding/analyzers/${ANALYZER_ID}?api-version=2025-05-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${API_KEY}"
```

### Option 2: Test in Azure AI Studio

1. Go to https://ai.azure.com
2. Open resource: `audsurvey-aiservices-l56h90`
3. Go to **Analyzers** → `audience-survey`
4. Click **Test** or **Playground**
5. Upload test image: `docs/20251101_113316.jpg`
6. Verify fields are extracted correctly

### Option 3: Test via Application

```bash
# Update .env.local with credentials
AZURE_CONTENT_ENDPOINT=https://audsurvey-aiservices-l56h90.services.ai.azure.com/
AZURE_CONTENT_KEY=your-api-key-here
AZURE_ANALYZER_ID=audience-survey

# Start dev server
npm run dev

# Test upload at http://localhost:3000
```

## Connecting to AI Foundry Project (Optional)

This step is **optional** but recommended for advanced scenarios.

### Step 1: Open AI Foundry Project

1. Go to https://ai.azure.com
2. Find project: `audsurvey-project-l56h90`
3. Click to open

### Step 2: Add Connection

1. Click **Management center** (bottom left)
2. Select **Connected resources**
3. Click **+ New connection**
4. Select **Azure AI services**
5. Choose: `audsurvey-aiservices-l56h90`
6. Click **Add connection**

### Benefits of Connection

- ✅ Use analyzer in Prompt Flow
- ✅ Integrate with AI Foundry Agent Service
- ✅ Unified monitoring and logging
- ✅ Centralized access control (RBAC)

## Troubleshooting

### Error: "Analyzer not found"

**Cause**: Analyzer name mismatch or not deployed yet  
**Solution**: 
- Verify exact name: `audience-survey` (case-sensitive)
- Wait 2-3 minutes after creation for deployment
- Check in Azure AI Studio portal

### Error: "Invalid API key"

**Cause**: Wrong key or expired credentials  
**Solution**:
```bash
cd iac
terraform output -raw ai_services_key
```
Update your script/environment with the correct key.

### Error: "Schema validation failed"

**Cause**: JSON schema format error  
**Solution**:
- Ensure using exact file: `docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json`
- Validate JSON: `cat docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json | jq .`
- Check for syntax errors

### Error: "Endpoint not found"

**Cause**: Wrong endpoint URL  
**Solution**:
- Verify format: `https://audsurvey-aiservices-l56h90.services.ai.azure.com/`
- Must end with `.services.ai.azure.com/` (not `.cognitiveservices.azure.com`)
- Get from Terraform: `terraform output -raw ai_services_endpoint`

## Next Steps

After analyzer is created:

1. ✅ Update `.env.local` with credentials
2. ✅ Test with sample survey image
3. ✅ Deploy application to Azure App Service
4. ✅ (Optional) Connect AI Services to AI Foundry Project
5. ✅ Monitor usage in Azure Portal

## Resources

- **Schema Details**: [ANALYZER_SCHEMA.md](ANALYZER_SCHEMA.md)
- **AI Foundry Integration**: [AZURE_INTEGRATION.md](AZURE_INTEGRATION.md)
- **Infrastructure Setup**: [iac/README.md](iac/README.md)
- **Migration Guide**: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

---

**Questions?** Check the [main README](README.md) or open an issue.
