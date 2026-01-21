# Assets Directory Policy

## Directory Structure

```
assets/
├── small/    # Safe to bake into Docker images (< 5MB each)
└── large/    # NEVER ship in Docker images - runtime mount only
```

## Large Assets Policy

**CRITICAL**: Files in `assets/large/` are:
1. **NOT tracked in Git** (use Git LFS or external storage)
2. **NOT copied into Docker images**
3. **Fetched at runtime** from Azure Blob Storage or mounted via Azure Files

### Where Large Assets Should Be Stored

| Environment | Storage Location |
|-------------|------------------|
| Development | `broxivadevstorage/assets-dev` |
| Staging     | `broxivastagingstorage/assets-staging` |
| Production  | `broxivaprodstorage/assets-prod` |

### How to Access Large Assets at Runtime

Large assets are mounted at `/app/assets` in containers:

1. **Azure Blob (Recommended)**: InitContainer downloads to shared volume
2. **Azure Files**: PVC mount at runtime

Set environment variables:
```bash
ASSET_SOURCE=blob   # or 'files'
ASSET_PATH=/app/assets
AZURE_STORAGE_ACCOUNT=broxivaprodstorage
AZURE_STORAGE_CONTAINER=assets-prod
```

## Small Assets Policy

Files in `assets/small/` can be:
1. Tracked in Git
2. Copied into Docker images
3. Must be < 5MB each
4. Examples: icons, logos, small config files

## File Type Guidelines

| Type | Max Size | Location | Git Tracked |
|------|----------|----------|-------------|
| Icons/logos | < 1MB | `small/` | Yes |
| Config JSON | < 1MB | `small/` | Yes |
| ML Models | Any | `large/` | No |
| Datasets | Any | `large/` | No |
| Videos | Any | `large/` | No |
| Large images | > 5MB | `large/` | No |

## Guardrails

CI will fail if:
- Any file > 50MB is tracked in Git (unless allowlisted)
- `assets/large/` contains files (should be empty in repo)
- Dockerfile tries to COPY from `assets/large/`
