# Audience Survey Analyzer Schema

This file contains the field schema for creating a custom analyzer in Azure AI Content Understanding.

## Analyzer Configuration

**Analyzer Name:** `audience-survey`  
**API Version:** `2025-05-01-preview`  
**Method:** Field Extraction  
**AI Services Endpoint:** `https://audsurvey-aiservices-l56h90.services.ai.azure.com/`  
**AI Foundry Project:** `audsurvey-project-l56h90` (optional connection)  
**Schema File:** `docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json`

## Field Definitions

The complete schema is stored in [`docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json`](docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json).

Copy this JSON schema when creating the analyzer in Azure AI Studio:

```json
{
  "fieldSchema": {
    "fields": {
      "Role": {
        "type": "string",
        "method": "extract",
        "description": "The role of the survey participant in the context of the presentation"
      },
      "YearsOfExperience": {
        "type": "string",
        "method": "extract",
        "description": "The number of years the participant has experience in AI/ML"
      },
      "Industry": {
        "type": "string",
        "method": "extract",
        "description": "The industry in which the participant works"
      },
      "AIKnowledgeLevel": {
        "type": "string",
        "method": "extract",
        "description": "The participant's self-assessed level of knowledge in AI"
      },
      "UsedAzureAI": {
        "type": "string",
        "method": "extract",
        "description": "Indicates whether the participant has used Azure AI before"
      },
      "TopicEngagement": {
        "type": "integer",
        "method": "extract",
        "description": "Rating for how engaging the topic was"
      },
      "ConceptClarity": {
        "type": "integer",
        "method": "extract",
        "description": "Rating for the clarity of the concepts presented"
      },
      "DemoUsefulness": {
        "type": "integer",
        "method": "extract",
        "description": "Rating for the usefulness of the demos"
      },
      "SkillLevelAppropriateness": {
        "type": "integer",
        "method": "extract",
        "description": "Rating for whether the skill level was appropriate"
      },
      "LearningOutcome": {
        "type": "integer",
        "method": "extract",
        "description": "Rating for how much the participant learned"
      },
      "RecommendScore": {
        "type": "integer",
        "method": "extract",
        "description": "The likelihood of the participant recommending the session, rated from 0 to 10"
      },
      "BestPart": {
        "type": "string",
        "method": "extract",
        "description": "The part of the presentation the participant liked the most"
      },
      "ImprovementSuggestions": {
        "type": "string",
        "method": "extract",
        "description": "Suggestions for improving the presentation"
      },
      "FutureTopics": {
        "type": "string",
        "method": "extract",
        "description": "Topics the participant would like to see in future presentations"
      }
    },
    "definitions": {}
  }
}
```

## Field Details

### String Fields (8 total)

| Field Name | Expected Values | Notes |
|-----------|-----------------|-------|
| `Role` | Student, Developer, Manager, Researcher, Hobbyist, Other | Checkbox selection |
| `YearsOfExperience` | Free text | Number of years in AI/ML |
| `Industry` | Free text | Industry sector |
| `AIKnowledgeLevel` | Beginner, Intermediate, Advanced, Expert | Radio button selection |
| `UsedAzureAI` | Yes, No, Planning to | Checkbox selection |
| `BestPart` | Free text | Open-ended feedback |
| `ImprovementSuggestions` | Free text | Open-ended feedback |
| `FutureTopics` | Free text | Open-ended feedback |

### Integer Fields (6 total)

| Field Name | Range | Type |
|-----------|-------|------|
| `TopicEngagement` | 1-5 | Likert scale |
| `ConceptClarity` | 1-5 | Likert scale |
| `DemoUsefulness` | 1-5 | Likert scale |
| `SkillLevelAppropriateness` | 1-5 | Likert scale |
| `LearningOutcome` | 1-5 | Likert scale |
| `RecommendScore` | 0-10 | NPS score |

## Creating the Analyzer

### Via Azure Portal / AI Studio

**Option 1: Azure AI Studio (Recommended)**

1. Navigate to [Azure AI Studio](https://ai.azure.com)
2. Open your AI Services resource: `audsurvey-aiservices-l56h90`
3. Go to "Content Understanding" or "Analyzers" section
4. Click "Create analyzer"
5. Enter analyzer name: `audience-survey`
6. Select "Custom field extraction"
7. Upload or paste schema from `docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json`
8. Save and deploy

**Option 2: Azure Portal (Direct)**

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Find your AI Services resource: `audsurvey-aiservices-l56h90`
3. Follow similar steps as above

### Via Azure CLI

```bash
# Create analyzer with schema file
az cognitiveservices content-understanding analyzer create \
  --resource-group rg-audience-survey \
  --account-name audsurvey-aiservices-l56h90 \
  --analyzer-name audience-survey \
  --schema @docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json

# Or get resource name from Terraform
RESOURCE_GROUP=$(cd iac && terraform output -raw resource_group_name)
AI_SERVICES_NAME=$(cd iac && terraform output -raw ai_services_name)

az cognitiveservices content-understanding analyzer create \
  --resource-group $RESOURCE_GROUP \
  --account-name $AI_SERVICES_NAME \
  --analyzer-name audience-survey \
  --schema @docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json
```

### Via REST API (Shell Script)

**Using the provided script with environment variables:**

```bash
# Export credentials from Terraform
cd iac
export AZURE_CONTENT_ENDPOINT=$(terraform output -raw ai_services_endpoint)
export AZURE_CONTENT_KEY=$(terraform output -raw ai_services_key)
cd ..

# Run script
./create-analyzer.sh
```

**Using command line parameters:**

```bash
# Get credentials from Terraform
cd iac
ENDPOINT=$(terraform output -raw ai_services_endpoint)
API_KEY=$(terraform output -raw ai_services_key)
cd ..

# Run with parameters
./create-analyzer.sh "$ENDPOINT" "$API_KEY" "audience-survey"
```

**Manual curl command:**

```bash
# Get credentials from Terraform
ENDPOINT=$(cd iac && terraform output -raw ai_services_endpoint)
API_KEY=$(cd iac && terraform output -raw ai_services_key)

# Create analyzer
curl -X PUT "${ENDPOINT}/contentunderstanding/analyzers/audience-survey?api-version=2025-05-01-preview" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${API_KEY}" \
  -d @docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json
```

**Expected response:**
- HTTP 201: Created successfully
- HTTP 200: Already exists (updated)
- HTTP 401: Invalid API key
- HTTP 400: Invalid schema format

## Training Recommendations

For optimal extraction accuracy:

1. **Provide Training Samples**
   - Upload 10-20 sample survey images
   - Include variety of handwriting styles
   - Cover all possible field values

2. **Survey Form Design**
   - Use clear section headers
   - Label all checkboxes and radio buttons
   - Use adequate spacing between fields
   - Recommend typed forms over handwritten

3. **Image Quality**
   - Minimum resolution: 1024x768
   - Good lighting (no shadows)
   - Flat surface (avoid perspective distortion)
   - Sharp focus (no motion blur)

## Testing the Analyzer

Use the Python test script (`docs/pythoncall.py`) or test directly in Azure AI Studio:

```python
# Test with sample image
python pythoncall.py
```

Expected output structure:
```json
{
  "status": "Succeeded",
  "result": {
    "contents": [{
      "fields": {
        "Role": { "type": "string", "valueString": "Manager" },
        "TopicEngagement": { "type": "integer", "valueInteger": 5 }
      }
    }]
  }
}
```

## Troubleshooting

### Field Not Extracted
- Check field name spelling matches schema exactly
- Verify survey form has clear label for the field
- Ensure image quality is sufficient
- Add more training samples if needed

### Wrong Value Extracted
- Improve image quality
- Check for ambiguous handwriting
- Add validation in application layer
- Fine-tune analyzer with corrected samples

### Low Confidence
- Use clearer fonts (minimum 12pt)
- Improve lighting when capturing image
- Ensure high-contrast (dark text on light background)
- Avoid degraded/compressed images

## Updating the Schema

If you need to add or modify fields:

1. Update this schema JSON
2. Update `lib/types.ts` TypeScript definitions
3. Update `lib/survey-mapper.ts` mapping logic
4. Redeploy analyzer in Azure
5. Test with new sample images

## Version History

- **v1.1** (2025-11-02): Updated for AI Foundry Project integration
  - Now uses Azure AI Services endpoint: `audsurvey-aiservices-l56h90.services.ai.azure.com`
  - Connected to AI Foundry Project: `audsurvey-project-l56h90`
  - Schema stored in: `docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json`
  - Updated creation instructions for new architecture

- **v1.0** (2025-11-01): Initial schema with 14 fields
  - 8 string fields
  - 6 integer fields
  - Based on presentation feedback survey template

---

**Schema Version:** 1.1  
**Last Updated:** November 2, 2025  
**API Version:** 2025-05-01-preview  
**AI Services Resource:** `audsurvey-aiservices-l56h90`  
**AI Foundry Project:** `audsurvey-project-l56h90`
