# Terraform configuration for Audience Survey Application
# Provisions Azure infrastructure: RG, Storage, Key Vault, AI Content Understanding, App Service

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
      recover_soft_deleted_key_vaults = true
    }
  }
  subscription_id = var.subscription_id
}

# Current Azure client configuration
data "azurerm_client_config" "current" {}

# Random suffix for unique resource names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  
  tags = var.tags
}

# Storage Account for uploaded survey images
resource "azurerm_storage_account" "main" {
  name                     = "${var.project_name}${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  # Security settings
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  
  blob_properties {
    delete_retention_policy {
      days = 7
    }
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "POST", "PUT"]
      allowed_origins    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
  
  tags = var.tags
}

# Blob container for uploaded survey images
resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Key Vault for secrets
resource "azurerm_key_vault" "main" {
  name                       = "${var.project_name}-kv-${random_string.suffix.result}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = true
  
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id
    
    key_permissions = [
      "Create",
      "Get",
      "Delete",
      "Purge",
      "GetRotationPolicy",
    ]
    
    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Purge",
      "Recover"
    ]
  }
  
  tags = var.tags
}

# Store storage account connection string in Key Vault
resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.main.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

# Azure AI Services (for AI Foundry and Content Understanding)
# CRITICAL: Content Understanding is accessed via AI Foundry Project connection to this AI Services resource
resource "azurerm_ai_services" "main" {
  name                  = "${var.project_name}-aiservices-${random_string.suffix.result}"
  location              = azurerm_resource_group.main.location
  resource_group_name   = azurerm_resource_group.main.name
  sku_name              = "S0"
  custom_subdomain_name = "${var.project_name}-aiservices-${random_string.suffix.result}"
  
  tags = var.tags
}

# Store AI Services key in Key Vault (for Content Understanding)
resource "azurerm_key_vault_secret" "ai_services_key" {
  name         = "azure-content-key"
  value        = azurerm_ai_services.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

# Store AI Services endpoint in Key Vault (for Content Understanding)
resource "azurerm_key_vault_secret" "ai_services_endpoint" {
  name         = "azure-content-endpoint"
  value        = azurerm_ai_services.main.endpoint
  key_vault_id = azurerm_key_vault.main.id
}

# Azure AI Foundry Hub
resource "azurerm_ai_foundry" "hub" {
  name                = "${var.project_name}-hub-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  storage_account_id  = azurerm_storage_account.main.id
  key_vault_id        = azurerm_key_vault.main.id
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = var.tags
}

# Azure AI Foundry Project
# Connected to AI Services resource for Content Understanding and AI models
resource "azurerm_ai_foundry_project" "main" {
  name               = "${var.project_name}-project-${random_string.suffix.result}"
  location           = azurerm_ai_foundry.hub.location
  ai_services_hub_id = azurerm_ai_foundry.hub.id
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = var.tags
}

# Generate AI Services connection YAML file from template
resource "local_file" "ai_services_connection_yml" {
  content = templatefile("${path.module}/aiservices-connection.yml", {
    ai_services_endpoint      = azurerm_ai_services.main.endpoint
    ai_services_resource_id   = azurerm_ai_services.main.id
  })
  filename = "${path.module}/aiservices-connection-generated.yml"
}

# Create AI Services connection to AI Foundry Project using Azure CLI
# This enables Content Understanding and AI model access within the AI Foundry Project
resource "null_resource" "ai_services_connection" {
  depends_on = [
    azurerm_ai_foundry_project.main,
    azurerm_ai_services.main,
    local_file.ai_services_connection_yml
  ]
  
  provisioner "local-exec" {
    command = <<-EOT
      az ml connection show \
        --name aiservices-connection \
        --resource-group ${azurerm_resource_group.main.name} \
        --workspace-name ${azurerm_ai_foundry_project.main.name} >/dev/null 2>&1 || \
      az ml connection create \
        --file ${local_file.ai_services_connection_yml.filename} \
        --resource-group ${azurerm_resource_group.main.name} \
        --workspace-name ${azurerm_ai_foundry_project.main.name}
    EOT
  }
  
  # Trigger recreation if AI Services resource changes
  triggers = {
    ai_services_id = azurerm_ai_services.main.id
    project_id     = azurerm_ai_foundry_project.main.id
    yaml_content   = local_file.ai_services_connection_yml.content
  }
}

# Grant AI Foundry Hub access to Key Vault
resource "azurerm_key_vault_access_policy" "hub" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_ai_foundry.hub.identity[0].principal_id
  
  key_permissions = [
    "Create",
    "Get",
    "Delete",
    "Purge",
    "GetRotationPolicy",
  ]
  
  secret_permissions = [
    "Get",
    "List",
    "Set"
  ]
}

# Note: Azure AI Foundry Hub and Project automatically create role assignments
# for Storage Account access with specific conditions. These are managed by Azure.

# Generate secure admin secret
resource "random_password" "admin_secret" {
  length  = 32
  special = true
}

# Store admin secret in Key Vault
resource "azurerm_key_vault_secret" "admin_secret" {
  name         = "admin-secret"
  value        = random_password.admin_secret.result
  key_vault_id = azurerm_key_vault.main.id
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.project_name}-plan-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  
  tags = var.tags
}

# App Service (Web App)
resource "azurerm_linux_web_app" "main" {
  name                = "${var.project_name}-app-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id
  
  site_config {
    always_on = var.app_service_sku != "F1" ? true : false  # Free tier doesn't support always_on
    
    application_stack {
      node_version = "20-lts"
    }
    
    # Enable managed identity for secure access to Azure services
    ftps_state = "Disabled"
    
    # Enable HTTP/2
    http2_enabled = true
  }
  
  app_settings = {
    # Azure AI Content Understanding (via AI Services)
    AZURE_CONTENT_ENDPOINT = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.ai_services_endpoint.id})"
    AZURE_CONTENT_KEY      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.ai_services_key.id})"
    AZURE_ANALYZER_ID      = var.analyzer_id
    
    # Azure Blob Storage (uses managed identity for auth in production)
    AZURE_STORAGE_ACCOUNT_NAME   = azurerm_storage_account.main.name
    AZURE_STORAGE_CONTAINER_NAME = azurerm_storage_container.uploads.name
    
    # Admin Secret for Session Management
    ADMIN_SECRET = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.admin_secret.id})"
    
    # Next.js settings
    WEBSITE_NODE_DEFAULT_VERSION       = "20-lts"
    SCM_DO_BUILD_DURING_DEPLOYMENT     = "true"
    
    # Performance optimizations
    WEBSITE_RUN_FROM_PACKAGE = "1"
    WEBSITE_ENABLE_SYNC_UPDATE_SITE = "true"
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  logs {
    detailed_error_messages = true
    failed_request_tracing  = true
    
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }
  
  tags = var.tags
}

# Grant App Service access to Key Vault
resource "azurerm_key_vault_access_policy" "app_service" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.main.identity[0].principal_id
  
  secret_permissions = [
    "Get",
    "List"
  ]
}

# Grant App Service access to Storage Account (using role assignment)
resource "azurerm_role_assignment" "app_service_storage" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_web_app.main.identity[0].principal_id
}
