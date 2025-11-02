output "resource_group_name" {
  description = "Name of the created resource group"
  value       = azurerm_resource_group.main.name
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "storage_account_connection_string" {
  description = "Storage account connection string"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

output "storage_container_name" {
  description = "Name of the blob container for uploads"
  value       = azurerm_storage_container.uploads.name
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "ai_content_endpoint" {
  description = "Azure AI Content Understanding endpoint"
  value       = azurerm_cognitive_account.ai_content.endpoint
}

output "ai_content_key" {
  description = "Azure AI Content Understanding primary key"
  value       = azurerm_cognitive_account.ai_content.primary_access_key
  sensitive   = true
}

output "admin_secret" {
  description = "Generated admin secret for session management"
  value       = random_password.admin_secret.result
  sensitive   = true
}

output "app_service_name" {
  description = "Name of the App Service"
  value       = azurerm_linux_web_app.main.name
}

output "app_service_default_hostname" {
  description = "Default hostname of the App Service"
  value       = azurerm_linux_web_app.main.default_hostname
}

output "app_service_url" {
  description = "Full URL of the deployed application"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "app_service_identity_principal_id" {
  description = "Principal ID of the App Service managed identity"
  value       = azurerm_linux_web_app.main.identity[0].principal_id
}

output "deployment_instructions" {
  description = "Instructions for deploying the application"
  value       = <<-EOT
    Deployment Instructions:
    
    1. Retrieve secrets from Key Vault:
       az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name azure-content-endpoint --query value -o tsv
       az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name azure-content-key --query value -o tsv
       az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name admin-secret --query value -o tsv
    
    2. Copy environment variables to local .env.local for development:
       AZURE_CONTENT_ENDPOINT="${azurerm_cognitive_account.ai_content.endpoint}"
       AZURE_CONTENT_KEY="<from Key Vault>"
       AZURE_ANALYZER_ID="${var.analyzer_id}"
       ADMIN_SECRET="<from Key Vault>"
    
    3. Build your Next.js application:
       npm run build
    
    4. Deploy to App Service using Azure CLI:
       az webapp deployment source config-zip \
         --resource-group ${azurerm_resource_group.main.name} \
         --name ${azurerm_linux_web_app.main.name} \
         --src ./.next/standalone.zip
       
       Or use Azure Static Web Apps deployment with staticwebapp.config.json
    
    5. Configure custom analyzer in Azure AI Studio:
       - Navigate to Azure AI Studio
       - Create custom analyzer with ID: ${var.analyzer_id}
       - Configure fields as documented in ANALYZER_SCHEMA.md
    
    6. Access your application:
       https://${azurerm_linux_web_app.main.default_hostname}
    
    7. Admin panel access:
       https://${azurerm_linux_web_app.main.default_hostname}/admin
       (Use admin secret from Key Vault)
    
    8. Monitor application logs:
       az webapp log tail --resource-group ${azurerm_resource_group.main.name} --name ${azurerm_linux_web_app.main.name}
  EOT
}

output "environment_variables" {
  description = "Environment variables for local development"
  value = {
    AZURE_CONTENT_ENDPOINT = azurerm_cognitive_account.ai_content.endpoint
    AZURE_ANALYZER_ID      = var.analyzer_id
  }
}
