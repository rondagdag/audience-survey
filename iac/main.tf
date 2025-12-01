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
  storage_account_id    = azurerm_storage_account.main.id
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

# Grant GitHub Actions service principal access to Key Vault
resource "azurerm_key_vault_access_policy" "github_actions" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = "cf511bf2-0e5f-48b7-8059-9b6cbdd8c8c4" # gh-audsurvey-deploy
  
  secret_permissions = [
    "Get",
    "List"
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

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "${var.project_name}acr${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false

  tags = var.tags
}

# Log Analytics Workspace for Container Apps Environment
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-law-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# Container Apps Environment
resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-cae-${random_string.suffix.result}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = var.tags
}

# User-assigned managed identity for Container App
# This allows us to grant Key Vault access BEFORE creating the Container App
resource "azurerm_user_assigned_identity" "container_app" {
  name                = "${var.project_name}-app-identity-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

# Grant Container App identity access to Key Vault BEFORE Container App creation
resource "azurerm_key_vault_access_policy" "container_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.container_app.principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Container App for the Next.js app
resource "azurerm_container_app" "web" {
  name                         = "${var.project_name}-app-${random_string.suffix.result}"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_app.id]
  }

  depends_on = [
    azurerm_key_vault_access_policy.container_app
  ]

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.container_app.id
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    container {
      name   = "web"
      image  = "${azurerm_container_registry.main.login_server}/${var.project_name}/web:${var.container_image_tag}"
      cpu    = var.container_cpu
      memory = var.container_memory

      env {
        name        = "AZURE_CONTENT_ENDPOINT"
        secret_name = "azure-content-endpoint"
      }
      env {
        name        = "AZURE_CONTENT_KEY"
        secret_name = "azure-content-key"
      }
      env {
        name  = "AZURE_ANALYZER_ID"
        value = var.analyzer_id
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = azurerm_storage_account.main.name
      }
      env {
        name  = "AZURE_STORAGE_CONTAINER_NAME"
        value = azurerm_storage_container.uploads.name
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.container_app.client_id
      }
      env {
        name        = "ADMIN_SECRET"
        secret_name = "admin-secret"
      }
      env {
        name  = "PORT"
        value = "3000"
      }
    }

    min_replicas = var.container_min_replicas
    max_replicas = var.container_max_replicas
  }

  secret {
    name                = "azure-content-key"
    key_vault_secret_id = azurerm_key_vault_secret.ai_services_key.id
    identity            = azurerm_user_assigned_identity.container_app.id
  }
  secret {
    name                = "azure-content-endpoint"
    key_vault_secret_id = azurerm_key_vault_secret.ai_services_endpoint.id
    identity            = azurerm_user_assigned_identity.container_app.id
  }
  secret {
    name                = "admin-secret"
    key_vault_secret_id = azurerm_key_vault_secret.admin_secret.id
    identity            = azurerm_user_assigned_identity.container_app.id
  }

  tags = var.tags
}

# Allow Container App identity to pull from ACR
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# Grant Container App identity access to Storage Account
resource "azurerm_role_assignment" "container_storage" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# Azure Front Door Profile (Standard tier for global CDN)
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.project_name}-afd-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard_AzureFrontDoor"

  tags = var.tags
}

# Front Door Endpoint (entry point for users)
resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.project_name}-endpoint-${random_string.suffix.result}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = var.tags
}

# Front Door Origin Group (backend pool configuration)
resource "azurerm_cdn_frontdoor_origin_group" "main" {
  name                     = "container-app-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }

  health_probe {
    protocol            = "Https"
    path                = "/"
    request_type        = "GET"
    interval_in_seconds = 100
  }
}

# Front Door Origin (Container App backend)
resource "azurerm_cdn_frontdoor_origin" "container_app" {
  name                           = "container-app-origin"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.main.id
  enabled                        = true
  host_name                      = azurerm_container_app.web.ingress[0].fqdn
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = azurerm_container_app.web.ingress[0].fqdn
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

# Front Door Route (routing rules)
resource "azurerm_cdn_frontdoor_route" "main" {
  name                          = "default-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.container_app.id]
  
  supported_protocols = ["Http", "Https"]
  patterns_to_match   = ["/*"]
  forwarding_protocol = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  # Cache configuration for static assets and API responses
  cache {
    query_string_caching_behavior = "IgnoreSpecifiedQueryStrings"
    query_strings                 = ["utm_source", "utm_medium", "utm_campaign"]
    compression_enabled           = true
    content_types_to_compress = [
      "application/javascript",
      "application/json",
      "application/xml",
      "text/css",
      "text/html",
      "text/javascript",
      "text/plain"
    ]
  }
}

# Note: WAF managed rules require Premium tier ($400+/month)
# Standard tier provides excellent CDN caching at ~$50/month
# For WAF protection, uncomment and upgrade sku_name to Premium_AzureFrontDoor

# Front Door Security Policy (WAF) - Commented out for Standard tier
# resource "azurerm_cdn_frontdoor_security_policy" "main" {
#   name                     = "security-policy"
#   cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
#
#   security_policies {
#     firewall {
#       cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id
#
#       association {
#         domain {
#           cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.main.id
#         }
#         patterns_to_match = ["/*"]
#       }
#     }
#   }
# }

# Front Door WAF Policy - Requires Premium tier
# resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
#   name                = "${var.project_name}waf${random_string.suffix.result}"
#   resource_group_name = azurerm_resource_group.main.name
#   sku_name            = "Premium_AzureFrontDoor"
#   mode                = "Prevention"
#   enabled             = true
#
#   managed_rule {
#     type    = "Microsoft_DefaultRuleSet"
#     version = "2.1"
#     action  = "Block"
#   }
#
#   managed_rule {
#     type    = "Microsoft_BotManagerRuleSet"
#     version = "1.0"
#     action  = "Block"
#   }
#
#   tags = var.tags
# }
