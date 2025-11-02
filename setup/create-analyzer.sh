#!/bin/bash
# Script to create the audience-survey custom analyzer in Azure AI Content Understanding
# Uses Azure AI Services endpoint (connected to AI Foundry Project: audsurvey-project-l56h90)
#
# Usage:
#   ./create-analyzer.sh [endpoint] [api-key] [analyzer-id]
#
# Or set environment variables:
#   export AZURE_CONTENT_ENDPOINT="https://..."
#   export AZURE_CONTENT_KEY="your-key"
#   export AZURE_ANALYZER_ID="audience-survey"
#   ./create-analyzer.sh
#
# Or use default values from Terraform outputs:
#   cd iac && export AZURE_CONTENT_ENDPOINT=$(terraform output -raw ai_services_endpoint)
#   export AZURE_CONTENT_KEY=$(terraform output -raw ai_services_key)
#   cd .. && ./create-analyzer.sh

# Configuration from parameters, environment variables, or defaults
ENDPOINT="${1:-${AZURE_CONTENT_ENDPOINT:-}}"
API_KEY="${2:-${AZURE_CONTENT_KEY:-}}"
ANALYZER_ID="${3:-${AZURE_ANALYZER_ID:-audience-survey}}"
API_VERSION="${API_VERSION:-2025-05-01-preview}"

# AI Foundry Project reference (for documentation)
AI_FOUNDRY_PROJECT="${AI_FOUNDRY_PROJECT:-}"

# Schema file location
SCHEMA_FILE="${SCHEMA_FILE:-docs/cu-task-5068_prebuilt-documentAnalyzer_2025-05-01-preview.json}"

# Check for required parameters
if [ -z "$API_KEY" ] || [ "$API_KEY" = "your-api-key-here" ]; then
  echo "Error: API key not provided!"
  echo ""
  echo "Please provide API key via one of these methods:"
  echo ""
  echo "1. Command line parameter:"
  echo "   ./create-analyzer.sh <endpoint> <api-key> [analyzer-id]"
  echo ""
  echo "2. Environment variable:"
  echo "   export AZURE_CONTENT_KEY='your-key'"
  echo "   ./create-analyzer.sh"
  echo ""
  echo "3. From Terraform outputs:"
  echo "   cd iac && export AZURE_CONTENT_KEY=\$(terraform output -raw ai_services_key)"
  echo "   cd .. && ./create-analyzer.sh"
  echo ""
  exit 1
fi

# Validate schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Error: Schema file not found: $SCHEMA_FILE"
  echo "Please ensure you're running this script from the project root directory."
  exit 1
fi

echo "========================================"
echo "Creating Custom Analyzer"
echo "========================================"
echo "Analyzer ID: $ANALYZER_ID"
echo "AI Services Endpoint: $ENDPOINT"
echo "AI Foundry Project: $AI_FOUNDRY_PROJECT"
echo "Schema File: $SCHEMA_FILE"
echo "API Version: $API_VERSION"
echo ""
echo "Note: This analyzer will be available in:"
echo "  - Azure AI Services (direct API access)"
echo "  - Azure AI Foundry Project (if connection configured)"
echo ""

echo "Creating analyzer..."
echo ""

curl -X PUT "${ENDPOINT}/contentunderstanding/analyzers/${ANALYZER_ID}?api-version=${API_VERSION}" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${API_KEY}" \
  -d @"$SCHEMA_FILE"

echo ""
echo "========================================"
echo "Analyzer Creation Complete"
echo "========================================"
echo ""
echo "Check the response above:"
echo "  - HTTP 201: Analyzer created successfully"
echo "  - HTTP 200: Analyzer already exists (updated)"
echo "  - HTTP 4xx/5xx: Error (check endpoint, key, or schema)"
echo ""
echo "Next steps:"
echo "1. Verify analyzer in Azure AI Studio: https://ai.azure.com"
echo "2. Test analyzer with sample image: docs/20251101_113316.jpg"
echo "3. (Optional) Connect AI Services to AI Foundry Project:"
echo "   - Project: $AI_FOUNDRY_PROJECT"
echo "   - Go to Management Center > Connected Resources"
echo "   - Add Azure AI Services connection"
echo "4. Update .env.local with credentials:"
echo "   AZURE_CONTENT_ENDPOINT=$ENDPOINT"
echo "   AZURE_CONTENT_KEY=<your-key>"
echo "   AZURE_ANALYZER_ID=$ANALYZER_ID"
echo ""
