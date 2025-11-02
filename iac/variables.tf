variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = "" # Set via environment variable or terraform.tfvars
}

variable "project_name" {
  description = "Name of the project (used as prefix for resources)"
  type        = string
  default     = "audsurvey"
  
  validation {
    condition     = can(regex("^[a-z0-9]{3,10}$", var.project_name))
    error_message = "Project name must be 3-10 characters, lowercase letters and numbers only."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-audience-survey"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "westus"
  
  validation {
    condition     = contains(["westus", "swedencentral", "australiaeast"], var.location)
    error_message = "Location must be one of the supported regions for AI Content Understanding: westus, swedencentral, australiaeast."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "AudienceSurvey"
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

variable "app_service_sku" {
  description = "SKU for App Service Plan"
  type        = string
  default     = "F1"
  
  validation {
    condition     = contains(["F1", "B1", "B2", "S1", "S2", "P1V2", "P2V2"], var.app_service_sku)
    error_message = "App Service SKU must be a valid tier (F1, B1, B2, S1, S2, P1V2, P2V2)."
  }
}

variable "analyzer_id" {
  description = "Azure AI Content Understanding custom analyzer ID"
  type        = string
  default     = "audience-survey"
}
