# Migration Guide: Azure AI Foundry Project Integration

**Date**: November 2, 2025  
**Change Summary**: Refactored infrastructure to use Azure AI Services with Azure AI Foundry Project integration instead of standalone cognitive account.

## Changes Overview

### Infrastructure (Terraform)

**Before:**
- Standalone `azurerm_cognitive_account` (kind: AIServices) for Content Understanding
- Direct connection from application to cognitive account

**After:**
- `azurerm_ai_services` resource (multi-service AI capability)
- `azurerm_ai_foundry` hub (central governance)
- `azurerm_ai_foundry_project` (AI workflow orchestration)
- Application uses AI Services endpoint directly
- Optional connection from AI Foundry Project to AI Services (for advanced scenarios)

### Architecture Benefits

1. **Unified AI Platform**: All AI resources managed through Azure AI Foundry
2. **Future-Proof**: Ready for advanced AI workflows (agents, model fine-tuning, evaluation)
3. **Enterprise Features**: Enhanced governance, RBAC, monitoring
4. **No Breaking Changes**: Application code unchanged - still uses Content Understanding API directly

## Migration Steps

### For Existing Deployments

If you have an existing deployment with the old `azurerm_cognitive_account`:

1. **Backup current state:**
   ```bash
   cd iac
   cp terraform.tfstate terraform.tfstate.pre-migration.backup
   ```

2. **Update Terraform configuration:**
   - Pull latest changes from repository
   - Review changes in `main.tf` and `outputs.tf`

3. **Plan migration:**
   ```bash
   terraform plan -out=migration.tfplan
   ```
   
   Expected changes:
   - **Remove**: `azurerm_cognitive_account.ai_content`
   - **Remove**: Key Vault secrets referencing cognitive account
   - **Add**: `azurerm_ai_foundry.hub`
   - **Add**: `azurerm_ai_foundry_project.main`
   - **Add**: Key Vault secrets for AI Services
   - **Update**: App Service environment variables (reference updated secrets)

4. **Apply migration:**
   ```bash
   terraform apply migration.tfplan
   ```

5. **Update environment variables:**
   - Endpoint format changes from `cognitiveservices.azure.com` to `services.ai.azure.com`
   - Retrieve new credentials:
     ```bash
     terraform output -raw ai_services_endpoint
     terraform output -raw ai_services_key
     ```

6. **Update .env.local for local development:**
   ```bash
   # Old format (deprecated)
   # AZURE_CONTENT_ENDPOINT=https://xxx.cognitiveservices.azure.com/
   
   # New format
   AZURE_CONTENT_ENDPOINT=https://xxx.services.ai.azure.com/
   ```

7. **Verify application:**
   - Test image upload functionality
   - Confirm analyzer still works
   - Check admin dashboard

### For New Deployments

Simply follow the updated [iac/README.md](iac/README.md) guide. All resources will be created with the new architecture.

## Environment Variable Changes

### Application (.env.local)

**No changes required** - same variable names, updated endpoint format:

```env
# Before
AZURE_CONTENT_ENDPOINT=https://xxx.cognitiveservices.azure.com/

# After
AZURE_CONTENT_ENDPOINT=https://xxx.services.ai.azure.com/
```

### Terraform Outputs

**Renamed outputs:**
- `ai_content_endpoint` → `ai_services_endpoint`
- `ai_content_key` → `ai_services_key`

**New outputs:**
- `ai_services_name`
- `ai_foundry_hub_name`
- `ai_foundry_hub_id`
- `ai_foundry_project_name`
- `ai_foundry_project_id`

## Documentation Updates

Updated files:
- ✅ `iac/main.tf` - Infrastructure definition
- ✅ `iac/outputs.tf` - Output variables and deployment instructions
- ✅ `iac/README.md` - Infrastructure guide
- ✅ `.example.env.local` - Environment variable template
- ✅ `README.md` - Main project documentation
- ✅ `AZURE_INTEGRATION.md` - Azure integration details
- ✅ `.github/copilot-instructions.md` - AI agent instructions

## Breaking Changes

### ❌ None for Application Code

The application code (`lib/azure-content-understanding.ts`) remains unchanged. It still:
- Uses `AZURE_CONTENT_ENDPOINT` environment variable
- Uses `AZURE_CONTENT_KEY` environment variable
- Calls Content Understanding REST API
- Works with the same analyzer ID

### ⚠️ Terraform State Changes

If you run `terraform apply` on an existing deployment:
- Old `azurerm_cognitive_account.ai_content` will be **destroyed**
- New `azurerm_ai_services.main` will be **created**
- **Data**: Custom analyzer configuration must be recreated in Azure AI Studio
- **Downtime**: Brief interruption while resources are recreated

**Mitigation**: Plan migration during maintenance window.

## AI Foundry Project Connection (Optional)

After infrastructure deployment, you can optionally connect AI Services to the AI Foundry Project:

1. Navigate to [Azure AI Foundry](https://ai.azure.com)
2. Open your AI Foundry Project
3. Go to **Management center** → **Connected resources**
4. Click **+ New connection**
5. Select **Azure AI services**
6. Choose your AI Services resource
7. Click **Add connection**

### When to Create Connection?

**Required for:**
- Using Content Understanding in Prompt Flow
- AI Foundry Agent Service integration
- Unified access control across AI services

**Not required for:**
- Basic Content Understanding API calls (current application usage)
- Standalone survey analysis

## Rollback Plan

If migration fails:

1. **Restore Terraform state:**
   ```bash
   cd iac
   cp terraform.tfstate.pre-migration.backup terraform.tfstate
   ```

2. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   ```

3. **Redeploy old configuration:**
   ```bash
   terraform plan
   terraform apply
   ```

## Testing Checklist

After migration, verify:

- [ ] Application starts without errors
- [ ] Admin can create session
- [ ] Image upload works
- [ ] Azure Content Understanding analyzes images
- [ ] Survey results display correctly
- [ ] CSV export functions
- [ ] Blob storage uploads work
- [ ] Key Vault secrets are accessible

## Support Resources

- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-foundry/)
- [Azure AI Services Documentation](https://learn.microsoft.com/azure/ai-services/)
- [Terraform Azure Provider Docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- Project Issues: [GitHub Repository](https://github.com/rondagdag/audience-survey/issues)

## FAQ

### Q: Will this affect my existing custom analyzer?

**A**: The analyzer is tied to the resource. After migration, you'll need to recreate it in the new AI Services resource using the same configuration.

### Q: Do I need to update my application code?

**A**: No. The application code remains unchanged. Only infrastructure and endpoint URLs change.

### Q: What's the cost difference?

**A**: Similar pricing. Azure AI Services uses the same SKU tiers as the standalone cognitive account. AI Foundry Hub/Project have no additional cost (pay only for compute/storage resources you use).

### Q: Can I keep using the old endpoint?

**A**: After migration, the old `cognitiveservices.azure.com` endpoint will no longer exist. You must update to the new `services.ai.azure.com` endpoint.

### Q: Is there downtime during migration?

**A**: Yes, brief downtime (5-10 minutes) while Terraform destroys old resources and creates new ones. Plan accordingly.

---

**Questions?** Open an issue or contact the maintainers.
