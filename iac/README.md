# Audience Survey Infrastructure as Code

This directory contains Terraform configuration for deploying the Audience Survey application infrastructure to Azure.

# Audience Survey Infrastructure as Code

> Note: This project now deploys to Azure Container Apps with Azure Container Registry via Terraform and GitHub Actions. Previous App Service references below are legacy and will be gradually updated. See the new GitHub workflow at `.github/workflows/deploy.yml` and the Terraform outputs `container_app_url` and `acr_login_server`.


## 📋 Prerequisites

1. **Azure CLI** - [Install Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
2. **Terraform** - [Install Terraform](https://www.terraform.io/downloads) (>= 1.0)
3. **Azure Subscription** - Active Azure subscription with appropriate permissions

## 🏗️ Infrastructure Components

The Terraform configuration provisions the following Azure resources:

- **Resource Group** - Logical container for all resources
- **Storage Account** - Blob storage for uploaded survey images
  - Container: `uploads` (private access)
  - CORS enabled for web uploads
  - 7-day retention policy
- **Azure AI Services** - Multi-service AI resource (Content Understanding + more)
  - Custom subdomain for API endpoint
  - S0 SKU tier
  - Provides Content Understanding API for the application
- **Azure AI Foundry Hub** - Central governance for AI projects
  - Connected to Storage and Key Vault
  - System-assigned managed identity
- **Azure AI Foundry Project** - AI workflow orchestration
  - Connected to AI Foundry Hub
  - Enables advanced AI scenarios (agents, model fine-tuning, evaluation)
  - Optional connection to AI Services (created via portal/CLI)
- **Key Vault** - Secure storage for secrets and keys
  - Storage connection string
  - AI Services API key and endpoint
  - Generated admin secret
 **Azure Container Registry (ACR)** - Private container image registry
 **Azure Container Apps Environment** - Hosting environment for ACA
 **Azure Container App** - Next.js container with managed identity, Key Vault secret references, and HTTP ingress on port 3000


## 🚀 Quick Start
### Container Apps (recommended)

Using GitHub Actions (see `.github/workflows/deploy.yml`):

1. Configure repository secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, and `ADMIN_SECRET`.
2. Push to `main` or run the workflow manually. The pipeline will:
  - Provision infra with Terraform (RG, Storage, Key Vault, AI Services, ACR, ACA)
  - Build and push the Docker image to ACR tagged with the commit SHA
  - Update the Container App to the new image
  - Run Playwright tests against the deployed URL

Manual steps (optional):

```bash
# Build and push image (requires az login and ACR permissions)
ACR=$(terraform output -raw acr_login_server)
PROJECT=audsurvey
TAG=$(git rev-parse --short HEAD)

docker build -t "$ACR/$PROJECT/web:$TAG" ./app
az acr login --name ${ACR%%.*}
docker push "$ACR/$PROJECT/web:$TAG"

# Update image tag via Terraform
terraform apply -var="container_image_tag=$TAG" -auto-approve
```

### 1. Configure Variables

Copy the example variables file and update with your values:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:
- `subscription_id` - Your Azure subscription ID
- Other variables as needed (optional, defaults provided)

### 2. Initialize Terraform

```bash
terraform init
```

This downloads required providers (azurerm, random) and prepares the working directory.

### 3. Plan Deployment

```bash
terraform plan -out=main.tfplan
```

Review the planned changes to ensure everything looks correct.

### 4. Apply Infrastructure

```bash
terraform apply main.tfplan
```

This will create all Azure resources. The process takes approximately 5-10 minutes.

### 5. Retrieve Outputs

```bash
# View all outputs
terraform output

# View specific outputs
terraform output app_service_url
terraform output ai_content_endpoint

# View sensitive outputs
terraform output -raw admin_secret
terraform output -raw ai_content_key
```

## 🔐 Environment Variables

After deployment, retrieve secrets for local development:

```bash
# Get Key Vault name
KV_NAME=$(terraform output -raw key_vault_name)

# Retrieve secrets
az keyvault secret show --vault-name $KV_NAME --name azure-content-endpoint --query value -o tsv
az keyvault secret show --vault-name $KV_NAME --name azure-content-key --query value -o tsv
az keyvault secret show --vault-name $KV_NAME --name admin-secret --query value -o tsv
```

Create `.env.local` in the project root:

```env
AZURE_CONTENT_ENDPOINT=<from-output>
AZURE_CONTENT_KEY=<from-keyvault>
AZURE_ANALYZER_ID=audience-survey
ADMIN_SECRET=<from-keyvault>
```

## 📦 Deploying the Application

### Option 1: Azure CLI

```bash
# Build the application
npm run build

# Create deployment package
cd .next/standalone
zip -r ../deployment.zip .
cd ../..

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group $(terraform output -raw resource_group_name) \
  --name $(terraform output -raw app_service_name) \
  --src .next/deployment.zip
```

### Option 2: GitHub Actions

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          package: .
```

## 🎯 Configure Custom Analyzer

After infrastructure deployment, configure the Azure AI Content Understanding analyzer:

1. Navigate to [Azure AI Studio](https://ai.azure.com)
2. Select your AI Services resource
3. Create a new custom analyzer with ID: `audience-survey`
4. Configure fields according to `../ANALYZER_SCHEMA.md`
5. Train and deploy the analyzer

### (Optional) Create AI Services Connection in AI Foundry Project

To enable advanced AI workflows within the Foundry Project:

1. Navigate to [Azure AI Foundry portal](https://ai.azure.com)
2. Open your AI Foundry Project
3. Select **Management center** → **Connected resources**
4. Click **+ New connection**
5. Select **Azure AI services**
6. Choose your AI Services resource from the list
7. Click **Add connection**

This connection is **optional** for basic Content Understanding usage but enables:
- Using Content Understanding in Prompt Flow
- Integrating with AI Foundry Agent Service
- Unified access control and monitoring

## 🔧 Configuration

### Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `subscription_id` | Azure subscription ID | - | Yes |
| `project_name` | Project prefix (3-10 chars) | `audsurvey` | No |
| `resource_group_name` | Resource group name | `rg-audience-survey` | No |
| `location` | Azure region | `westus` | No |
| `app_service_sku` | App Service SKU | `B1` | No |
| `analyzer_id` | Custom analyzer ID | `audience-survey` | No |
| `tags` | Resource tags | See variables.tf | No |

### Supported Regions

Azure AI Content Understanding is available in:
- `westus` (West US)
- `swedencentral` (Sweden Central)
- `australiaeast` (Australia East)

## 📊 Monitoring

### View Application Logs (Container Apps)

```bash
RG_NAME=$(terraform output -raw resource_group_name)
APP_NAME=$(terraform output -raw container_app_name)

az containerapp logs show --resource-group $RG_NAME --name $APP_NAME --follow true
```

### Access Application URL

```bash
terraform output container_app_url
```

## 🧹 Cleanup

To destroy all resources and stop incurring charges:

```bash
terraform destroy
```

⚠️ **Warning**: This will permanently delete all resources including:
- All uploaded survey images in blob storage
- All stored secrets in Key Vault
- The deployed web application

## 🔒 Security Best Practices

1. **Never commit secrets** - Use terraform.tfvars and .env.local (both gitignored)
2. **Key Vault access** - Managed identity used for App Service access
3. **Storage security** - Private blob containers, TLS 1.2 minimum
4. **Network security** - Consider adding VNet integration for production
5. **RBAC** - App Service uses least-privilege role assignments

## 🆘 Troubleshooting

### Architecture Note

The application accesses Content Understanding via the **AI Services endpoint directly**. The AI Foundry Project connection is optional and enables advanced scenarios like:
- AI agent development with Foundry Agent Service
- Model fine-tuning on survey data
- Prompt Flow integration
- Unified governance and monitoring

For basic Content Understanding API usage, only the AI Services credentials are required.

### Error: "Custom subdomain already exists"

The AI Services resource requires a globally unique custom subdomain. Change `project_name` variable:

```hcl
project_name = "audsurvey2"
```

### Error: "Location not supported"

Ensure `location` is one of: `westus`, `swedencentral`, `australiaeast`

### App Service not starting

Check application logs:

```bash
az webapp log tail --resource-group <rg-name> --name <app-name>
```

Common issues:
- Missing environment variables
- Build errors (check SCM logs)
- Node.js version mismatch

## 📚 Additional Resources

- [Azure AI Content Understanding Docs](https://learn.microsoft.com/azure/ai-services/content-understanding/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure App Service Docs](https://learn.microsoft.com/azure/app-service/)
- [Project Documentation](../README.md)

## 📝 License

This infrastructure code follows the same license as the parent project.
