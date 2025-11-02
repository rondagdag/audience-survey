# Azure AI Content Understanding Integration

This document explains how the Audience Survey application integrates with Azure AI Content Understanding service.

## Overview

The application uses **Azure AI Content Understanding** (via Azure AI Services) with a custom analyzer to extract structured data from survey form images. The Azure AI Services resource is integrated with an **Azure AI Foundry Project**, which provides a unified platform for AI workflows, model deployments, and connections.

**Architecture:**
- **Azure AI Services**: Provides Content Understanding API and other AI capabilities
- **Azure AI Foundry Project**: Connected to AI Services for advanced AI workflows and model management
- **Application**: Uses AI Services endpoint directly for Content Understanding API calls

The service uses advanced AI models to:

1. Perform OCR (Optical Character Recognition) on the image
2. Extract specific fields based on a custom schema
3. Return structured JSON data with high confidence

## API Flow

### 1. Start Analysis (POST)

```typescript
POST {endpoint}/contentunderstanding/analyzers/{analyzer_id}:analyze
Query Parameters:
  - api-version: 2025-05-01-preview
  - stringEncoding: utf16

Headers:
  - Content-Type: application/octet-stream
  - Ocp-Apim-Subscription-Key: {api_key}
  - x-ms-useragent: audience-survey-app

Body:
  - Raw image buffer (JPEG, PNG, or WebP)
```

**Response:**
- Status: 202 Accepted
- Header: `operation-location` (URL for polling)

### 2. Poll for Result (GET)

```typescript
GET {operation-location}
Headers:
  - Ocp-Apim-Subscription-Key: {api_key}
```

**Response Statuses:**
- `NotStarted` or `Running`: Continue polling
- `Succeeded`: Analysis complete, result available
- `Failed`: Analysis failed

### 3. Extract Result

Once status is `Succeeded`, the response contains:

```json
{
  "id": "operation-id",
  "status": "Succeeded",
  "result": {
    "analyzerId": "audience-survey",
    "apiVersion": "2025-05-01-preview",
    "createdAt": "2025-11-01T16:38:58Z",
    "contents": [
      {
        "markdown": "Full OCR text...",
        "fields": {
          "Role": {
            "type": "string",
            "valueString": "Manager"
          },
          "AIKnowledgeLevel": {
            "type": "string",
            "valueString": "Intermediate"
          },
          "TopicEngagement": {
            "type": "integer",
            "valueInteger": 5
          },
          "RecommendScore": {
            "type": "integer",
            "valueInteger": 10
          },
          // ... more fields
        }
      }
    ]
  }
}
```

## Custom Analyzer Schema

The analyzer is configured with these fields:

### String Fields (method: extract)

| Field Name | Description |
|------------|-------------|
| `Role` | Survey participant's role (Student, Developer, Manager, etc.) |
| `YearsOfExperience` | Years of AI/ML experience |
| `Industry` | Industry sector |
| `AIKnowledgeLevel` | Self-assessed AI knowledge (Beginner, Intermediate, Advanced, Expert) |
| `UsedAzureAI` | Whether participant has used Azure AI (Yes, No, Planning to) |
| `BestPart` | What they liked most about the presentation |
| `ImprovementSuggestions` | Suggestions for improvement |
| `FutureTopics` | Topics for future presentations |

### Integer Fields (method: extract)

| Field Name | Description | Range |
|------------|-------------|-------|
| `TopicEngagement` | How engaging was the topic | 1-5 |
| `ConceptClarity` | Clarity of concepts presented | 1-5 |
| `DemoUsefulness` | Usefulness of demos | 1-5 |
| `SkillLevelAppropriateness` | Appropriateness of skill level | 1-5 |
| `LearningOutcome` | How much they learned | 1-5 |
| `RecommendScore` | Likelihood to recommend (NPS) | 0-10 |

## Implementation Details

### TypeScript Types

```typescript
// API Response Structure
interface AzureContentField {
  type: 'string' | 'integer';
  valueString?: string;
  valueInteger?: number;
}

interface AzureContentResult {
  analyzerId: string;
  apiVersion: string;
  createdAt: string;
  contents: Array<{
    markdown: string;
    fields: {
      Role?: AzureContentField;
      AIKnowledgeLevel?: AzureContentField;
      TopicEngagement?: AzureContentField;
      // ... other fields
    };
  }>;
}
```

### Service Class

The `AzureContentUnderstandingService` class (`lib/azure-content-understanding.ts`) handles:

1. **Authentication**: Uses subscription key from environment
2. **Image Upload**: Sends raw buffer as octet-stream
3. **Polling**: Automatically polls until completion (2-second intervals, 120s timeout)
4. **Error Handling**: Graceful degradation when service unavailable

```typescript
const service = new AzureContentUnderstandingService();
const result = await service.analyzeImage(imageBuffer);
```

### Mapper Class

The `SurveyMapper` class (`lib/survey-mapper.ts`) transforms Azure's response into application-specific types:

```typescript
const mapper = new SurveyMapper();
const surveyResult = mapper.mapToSurveyResult(azureResult, sessionId);
```

**Mapping Logic:**
- Extracts fields from `result.contents[0].fields`
- Validates and normalizes string values (case-insensitive matching)
- Applies defaults for missing integer fields
- Maintains type safety with TypeScript

## Environment Variables

Required configuration in `.env.local`:

```env
AZURE_CONTENT_ENDPOINT=https://your-aiservices-name.services.ai.azure.com/
AZURE_CONTENT_KEY=your-32-char-api-key
AZURE_ANALYZER_ID=audience-survey
```

**Getting Credentials:**

1. **Deploy infrastructure** using Terraform (see `iac/README.md`) or create resources manually:
   - Azure AI Services resource (provides Content Understanding)
   - Azure AI Foundry Hub
   - Azure AI Foundry Project (connected to AI Services)

2. **Get AI Services credentials:**
   - Navigate to Azure AI Services resource in Azure Portal
   - Go to "Keys and Endpoint" section
   - Copy endpoint URL (format: `https://<name>.services.ai.azure.com/`)
   - Copy Key 1 or Key 2

3. **Create custom analyzer in Azure AI Studio:**
   - Navigate to [Azure AI Studio](https://ai.azure.com)
   - Go to your AI Services resource
   - Create custom analyzer with ID: `audience-survey`
   - Configure fields as documented in ANALYZER_SCHEMA.md

4. **(Optional) Connect AI Services to AI Foundry Project:**
   - This step is optional for basic Content Understanding usage
   - Enables advanced AI workflows within the Foundry Project
   - See deployment instructions in `iac/outputs.tf` for details

## Error Handling

The application handles several error scenarios:

### Service Not Configured
```json
{
  "success": false,
  "error": "Azure AI service is not configured..."
}
```

### Analysis Failed
```json
{
  "success": false,
  "error": "Couldn't read survey. Please try again with better lighting..."
}
```

### Timeout
Polling timeout after 120 seconds with clear error message.

## Performance Characteristics

- **Typical Analysis Time**: 5-15 seconds
- **Polling Interval**: 2 seconds
- **Max Timeout**: 120 seconds
- **Max File Size**: 10MB
- **Supported Formats**: JPEG, PNG, WebP

## Testing Without Azure

The application gracefully handles missing Azure credentials:

1. Service constructor logs warning
2. `analyzeImage()` throws descriptive error
3. API route catches and returns user-friendly message
4. Frontend shows appropriate error state

For development without Azure:
- Mock the `AzureContentUnderstandingService` class
- Return sample data matching `AzureContentResult` interface
- Test with sample JSON from `docs/20251101_113316.jpg.json`

## Sample Response

See `docs/20251101_113316.jpg.json` for a complete real-world response.

Key structure:
```
result.contents[0].fields.{FieldName}.value{String|Integer}
```

## Best Practices

### For Production

1. **Security**: Never commit API keys (use environment variables)
2. **Retry Logic**: Already implemented with exponential backoff
3. **Logging**: Service logs elapsed time and errors
4. **Validation**: Always validate field types before accessing values
5. **Graceful Degradation**: Handle missing/empty fields with defaults

### For Optimal Accuracy

1. Use well-lit, high-contrast survey photos
2. Ensure text is readable (minimum 12pt font recommended)
3. Keep survey form flat (avoid perspective distortion)
4. Use clear checkboxes or radio buttons
5. Avoid handwriting if possible (typed forms work better)

## Troubleshooting

### "Operation timed out"
- Check Azure service status
- Verify network connectivity
- Increase timeout in production if needed

### "Analysis failed"
- Check if image is corrupted
- Verify image format is supported
- Ensure adequate lighting/contrast in photo

### "Not configured"
- Verify all three environment variables are set
- Check endpoint includes protocol (https://) and trailing slash
- Ensure API key is valid (32 characters)

### Empty Fields Returned
- Improve image quality
- Check if field names match schema exactly
- Verify analyzer is trained on similar survey formats

## Azure AI Foundry Project Integration

### What is Azure AI Foundry?

Azure AI Foundry is a unified platform for building, deploying, and managing AI applications. It provides:

- **Project-based collaboration**: Organize AI resources and workflows
- **Model catalog**: Access to Azure OpenAI, open-source models, and custom models
- **Connections**: Secure integration with Azure services (AI Services, Storage, Search, etc.)
- **Evaluation & monitoring**: Built-in tools for testing and observability

### Why Connect AI Services to AI Foundry Project?

While the application uses the AI Services endpoint directly for Content Understanding, connecting it to an AI Foundry Project enables:

1. **Unified management**: All AI resources in one place
2. **Advanced workflows**: Integrate Content Understanding with other AI services
3. **Agent development**: Use Foundry Agent Service with extracted survey data
4. **Model fine-tuning**: Train custom models on survey responses
5. **Enterprise features**: RBAC, private endpoints, compliance controls

### Architecture Pattern

```
Application → Azure AI Services (Content Understanding)
                     ↓
              AI Foundry Project (optional connection)
                     ↓
              Advanced AI Workflows (Agents, Models, Evaluation)
```

The connection is **optional** for basic Content Understanding usage but **recommended** for production deployments with multiple AI services.

## References

- [Azure AI Content Understanding Documentation](https://learn.microsoft.com/azure/ai-services/content-understanding/)
- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-foundry/)
- [Python Sample Implementation](docs/pythoncall.py)
- [Analyzer Field Schema](docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json)

---

**Last Updated**: November 2, 2025
