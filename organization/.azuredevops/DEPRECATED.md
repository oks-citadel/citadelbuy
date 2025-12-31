# DEPRECATED - Azure DevOps Pipelines

**Status:** DEPRECATED as of 2025-12-30

These Azure DevOps pipeline configurations are no longer in active use. The Broxiva platform has migrated to:

1. **GitHub Actions** for CI/CD (`.github/workflows/ci-cd.yml`)
2. **AWS ECR** for container registry
3. **AWS EKS** for Kubernetes orchestration

## Migration Summary

| Azure DevOps | Replacement |
|--------------|-------------|
| Azure Pipelines | GitHub Actions |
| Azure Container Registry (ACR) | Amazon ECR |
| Azure Kubernetes Service (AKS) | Amazon EKS |
| Azure Key Vault | AWS Secrets Manager |

## Active CI/CD Configuration

The active CI/CD configuration is located at:
```
.github/workflows/ci-cd.yml
```

This workflow handles:
- Build and test
- Docker image build and push to ECR
- Deployment to EKS

## Required GitHub Secrets

To use the new CI/CD pipeline, configure these GitHub secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`
- `TURBO_TOKEN` (optional)
- `TURBO_TEAM` (optional)

## Files in This Directory

These files are kept for reference but should NOT be used for new deployments:

- `pipelines/cd-api.yml`
- `pipelines/cd-web.yml`
- `pipelines/cd-services.yml`
- `pipelines/infrastructure.yml`
- `pipelines/release-pipeline.yml`
- `pipelines/templates/*`

## Questions

Contact: devops@broxiva.com
