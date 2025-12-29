# Terraform Workflows - Quick Reference Card

## File Locations

All workflows: `C:\Users\Dell\OneDrive\Documents\Broxiva\organization\.github\workflows\`

Terraform config: `infrastructure/terraform/environments/{dev,staging,prod}/`

## Workflows at a Glance

| Workflow | File | Trigger | Approval? | Purpose |
|----------|------|---------|-----------|---------|
| Plan | `terraform-plan.yml` | PR to main/develop | No | Validate & plan changes |
| Dev Apply | `terraform-apply-dev.yml` | Push to develop | No | Deploy to dev |
| Staging Apply | `terraform-apply-staging.yml` | Push to staging | **Yes** | Deploy to staging |
| Prod Apply | `terraform-apply-prod.yml` | Push to main | **Yes** | Deploy to production |
| Drift Detection | `terraform-drift-detection.yml` | Daily 6am UTC | No | Detect infrastructure drift |

## Common Commands

### Create a PR for Changes
```bash
git checkout -b feature/my-terraform-change
# Make changes to infrastructure/terraform/
git add .
git commit -m "Update Terraform configuration"
git push origin feature/my-terraform-change
# Create PR to develop or main
```

### Manually Deploy to Dev
```
Actions > Terraform Apply - Dev > Run workflow
Confirmation: "apply"
```

### Manually Deploy to Staging
```
Actions > Terraform Apply - Staging > Run workflow
Confirmation: "apply"
Then approve in the deployment UI
```

### Manually Deploy to Production
```
Actions > Terraform Apply - Production > Run workflow
Confirmation: "apply-production"
Reason: "Your deployment reason"
Then approve in the deployment UI (requires 2+ approvers)
```

### Check for Drift
```
Actions > Terraform Drift Detection > Run workflow
Environment: Select "all" or specific environment
```

## Azure Configuration

**Subscription ID**: `ba233460-2dbe-4603-a594-68f93ec9deb3`

**State Storage**:
- Resource Group: `broxiva-tfstate-rg`
- Storage Account: `broxivatfstate`
- Container: `tfstate`

**State Files**:
- Dev: `dev.terraform.tfstate`
- Staging: `staging.terraform.tfstate`
- Production: `prod.terraform.tfstate`

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Azure AD App Registration Client ID |
| `AZURE_TENANT_ID` | Azure AD Tenant ID |
| `DB_ADMIN_PASSWORD` | Database password (dev/staging) |
| `DB_ADMIN_PASSWORD_PROD` | Database password (production) |
| `ONCALL_EMAIL` | On-call engineer email |
| `TEAM_EMAIL` | Team email |

## GitHub Environments

| Environment | Approval | Reviewers | Branch | URL |
|-------------|----------|-----------|--------|-----|
| dev | No | None | develop | https://dev.broxiva.com |
| staging | Yes | 1-2 | staging | https://staging.broxiva.com |
| production | Yes | 2+ | main | https://broxiva.com |

## Workflow Outputs

### Artifacts Retention

| Environment | Plan | Apply | State Backup | Drift Report |
|-------------|------|-------|--------------|--------------|
| Dev | 5 days | 5 days | N/A | 30 days |
| Staging | 5 days | 90 days | N/A | 30 days |
| Production | 30 days | 365 days | 365 days | 90 days |

### Where to Find Information

- **Plan Output**: PR comments or workflow summary
- **Apply Output**: Workflow summary + artifacts
- **Drift Reports**: Workflow artifacts + GitHub issues
- **Verification**: Post-deployment job logs

## Emergency Procedures

### Rollback Production
1. Identify last known good commit
2. Create hotfix branch from that commit
3. Push to main
4. Approve deployment
5. Monitor post-deployment verification

### Fix State Lock
```bash
# Via Azure CLI
az storage blob list \
  --account-name broxivatfstate \
  --container-name tfstate \
  --prefix .terraform.lock

# Via Terraform (use with caution)
cd infrastructure/terraform/environments/{env}
terraform force-unlock <LOCK_ID>
```

### Manual State Recovery
```bash
# Download state backup from artifacts
# Restore to Azure Storage
az storage blob upload \
  --account-name broxivatfstate \
  --container-name tfstate \
  --name {env}.terraform.tfstate \
  --file backup-state.tfstate
```

## Troubleshooting Quick Fixes

### OIDC Authentication Failed
- Verify federated credentials match repository name
- Check branch name matches credential subject
- Confirm tenant ID and client ID are correct

### Plan Shows Unexpected Changes
- Run drift detection to identify manual changes
- Review drift report
- Decide: import, revert, or update config

### Approval Not Working
- Verify environment exists with correct name
- Check reviewers are added to environment
- Verify branch restrictions

### Workflow Not Triggering
- Check branch protection rules
- Verify file paths in trigger conditions
- Check if workflow is disabled

## Best Practices

1. **Always Review Plans**: Never approve without reviewing plan output
2. **Test in Dev First**: Always deploy to dev before staging/prod
3. **Document Changes**: Add clear commit messages and PR descriptions
4. **Monitor Deployments**: Watch post-deployment verification
5. **Check Drift Regularly**: Review drift detection reports weekly
6. **Keep Secrets Secure**: Rotate secrets quarterly
7. **Use Approval Process**: Never bypass staging/prod approvals
8. **Maintain Documentation**: Update runbooks after major changes

## Support Contacts

- **DevOps Team**: See team documentation
- **On-Call**: Check on-call schedule
- **Emergency**: Escalation procedures in runbook

## Quick Links

- [Full Documentation](README-TERRAFORM-WORKFLOWS.md)
- [Setup Checklist](TERRAFORM-SETUP-CHECKLIST.md)
- [Workflow Summary](TERRAFORM_WORKFLOWS_SUMMARY.txt)
- [Terraform Docs](https://www.terraform.io/docs)
- [Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Last Updated**: 2025-12-10
**Version**: 1.0
