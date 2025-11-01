# Audience Survey Analyzer Schema

This file contains the field schema for creating a custom analyzer in Azure AI Content Understanding.

## Analyzer Configuration

**Analyzer Name:** `audience-survey`  
**API Version:** `2025-05-01-preview`  
**Method:** Field Extraction

## Field Definitions

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

### Via Azure Portal

1. Navigate to your Azure AI Content Understanding resource
2. Go to "Analyzers" section
3. Click "Create analyzer"
4. Enter analyzer name: `audience-survey`
5. Select "Custom field extraction"
6. Copy-paste the JSON schema above
7. Save and deploy

### Via Azure CLI

```bash
# Create analyzer with schema
az cognitiveservices content-understanding analyzer create \
  --resource-group your-resource-group \
  --account-name your-account-name \
  --analyzer-name audience-survey \
  --schema @analyzer-schema.json
```

### Via REST API

```bash
PUT https://{endpoint}/contentunderstanding/analyzers/audience-survey?api-version=2025-05-01-preview
Content-Type: application/json
Ocp-Apim-Subscription-Key: {your-key}

{
  "fieldSchema": { ... }
}
```

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

- **v1.0** (2025-11-01): Initial schema with 14 fields
  - 8 string fields
  - 6 integer fields
  - Based on presentation feedback survey template

---

**Schema Version:** 1.0  
**Last Updated:** November 1, 2025  
**API Version:** 2025-05-01-preview
