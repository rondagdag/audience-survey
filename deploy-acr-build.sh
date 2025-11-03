#!/bin/bash
set -e

echo "🚀 Manual Deployment to Azure Container Apps (ACR Build)"
echo "========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables from terraform outputs
echo "📦 Loading configuration from Terraform..."
cd iac

if [ ! -f "terraform.tfstate" ]; then
    echo -e "${RED}❌ Error: terraform.tfstate not found. Run 'terraform apply' first.${NC}"
    exit 1
fi

export ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server 2>/dev/null)
export CONTAINER_APP_NAME=$(terraform output -raw container_app_name 2>/dev/null)
export RESOURCE_GROUP_NAME=$(terraform output -raw resource_group_name 2>/dev/null)
export KEY_VAULT_NAME=$(terraform output -raw key_vault_name 2>/dev/null)
export STORAGE_ACCOUNT_NAME=$(terraform output -raw storage_account_name 2>/dev/null)
export PROJECT_NAME="audsurvey"

if [ -z "$ACR_LOGIN_SERVER" ] || [ -z "$CONTAINER_APP_NAME" ]; then
    echo -e "${RED}❌ Error: Could not load Terraform outputs. Ensure infrastructure is deployed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuration loaded${NC}"
echo "   ACR: $ACR_LOGIN_SERVER"
echo "   App: $CONTAINER_APP_NAME"
echo "   RG:  $RESOURCE_GROUP_NAME"
echo ""

cd ..

# Check Azure login
echo "🔐 Checking Azure authentication..."
if ! az account show &>/dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure. Running 'az login'...${NC}"
    az login
else
    ACCOUNT=$(az account show --query name -o tsv)
    echo -e "${GREEN}✅ Logged in as: $ACCOUNT${NC}"
fi
echo ""

# Generate image tag
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "manual-$(date +%s)")
IMAGE_TAG="$PROJECT_NAME/web:$GIT_SHA"
IMAGE_TAG_LATEST="$PROJECT_NAME/web:latest"

echo "☁️  Building Docker image in Azure Container Registry..."
echo "   Image: $ACR_LOGIN_SERVER/$IMAGE_TAG"
echo "   Building in cloud (no local Docker required)..."
echo ""

ACR_NAME="${ACR_LOGIN_SERVER%%.*}"

# Build image using ACR build task (no local Docker needed!)
az acr build \
    --registry "$ACR_NAME" \
    --image "$IMAGE_TAG" \
    --image "$IMAGE_TAG_LATEST" \
    --platform linux/amd64 \
    --file app/Dockerfile \
    ./app

echo -e "${GREEN}✅ Image built and pushed successfully${NC}"
echo ""

# Get secrets from Key Vault
echo "🔐 Retrieving secrets from Key Vault..."
AZURE_CONTENT_ENDPOINT=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name azure-content-endpoint --query value -o tsv)
AZURE_CONTENT_KEY=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name azure-content-key --query value -o tsv)
ADMIN_SECRET=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name admin-secret --query value -o tsv)

if [ -z "$AZURE_CONTENT_ENDPOINT" ] || [ -z "$AZURE_CONTENT_KEY" ] || [ -z "$ADMIN_SECRET" ]; then
    echo -e "${RED}❌ Error: Failed to retrieve secrets from Key Vault${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Secrets retrieved${NC}"
echo ""

# Full image name with ACR
FULL_IMAGE="$ACR_LOGIN_SERVER/$IMAGE_TAG"

# Update Container App
echo "📦 Updating Container App with new image..."
echo "   Image: $FULL_IMAGE"
echo ""

az containerapp update \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP_NAME \
    --image "$FULL_IMAGE" \
    --set-env-vars \
        AZURE_CONTENT_ENDPOINT="$AZURE_CONTENT_ENDPOINT" \
        AZURE_CONTENT_KEY="$AZURE_CONTENT_KEY" \
        AZURE_ANALYZER_ID=audience-survey \
        AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT_NAME \
        AZURE_STORAGE_CONTAINER_NAME=uploads \
        ADMIN_SECRET="$ADMIN_SECRET" \
        PORT=3000

echo -e "${GREEN}✅ Container App updated successfully${NC}"
echo ""

# Get the app URL
APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP_NAME --query properties.configuration.ingress.fqdn -o tsv)

echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo -e "${GREEN}Your app is deployed at:${NC}"
echo -e "${GREEN}https://$APP_URL${NC}"
echo ""
echo "Next steps:"
echo "  1. Wait 30-60 seconds for the app to start"
echo "  2. Visit the URL above to test"
echo "  3. Go to /admin to create a session"
echo ""
echo "To view logs:"
echo "  az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP_NAME --follow"
echo ""
