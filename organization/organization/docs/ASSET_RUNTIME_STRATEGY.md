# Large Asset Runtime Strategy

## Overview

Large assets (ML models, datasets, media files) are **NOT** baked into Docker images. Instead, they are:
1. Stored in Azure Blob Storage or Azure Files
2. Downloaded or mounted at runtime
3. Accessed from `/app/assets` inside containers

## Why Runtime Assets?

| Factor | Baked into Image | Runtime Mount |
|--------|------------------|---------------|
| Image Size | Large (GBs) | Small (<500MB) |
| Build Time | Slow | Fast |
| Asset Updates | Requires rebuild | Instant |
| Rollback | Must redeploy | Just restart |
| Multi-region | Each region builds | Share assets |

## Storage Configuration

### Azure Blob Storage (Recommended)

| Environment | Storage Account | Container |
|-------------|-----------------|-----------|
| Development | broxivadevstorage | assets-dev |
| Staging | broxivastagingstorage | assets-staging |
| Production | broxivaprodstorage | assets-prod |

### Azure Files (Alternative)

| Environment | Storage Account | Share |
|-------------|-----------------|-------|
| Development | broxivadevstorage | assets-dev |
| Staging | broxivastagingstorage | assets-staging |
| Production | broxivaprodstorage | assets-prod |

## Implementation Options

### Option A: Azure Blob with InitContainer (Recommended)

**Best for:** Large ML models, infrequently updated assets

```yaml
initContainers:
  - name: asset-downloader
    image: mcr.microsoft.com/azure-cli:latest
    command: ["/bin/bash", "-c"]
    args:
      - az login --identity && az storage blob download-batch ...
    volumeMounts:
      - name: shared-assets
        mountPath: /assets
containers:
  - name: api
    volumeMounts:
      - name: shared-assets
        mountPath: /app/assets
        readOnly: true
volumes:
  - name: shared-assets
    emptyDir:
      sizeLimit: "5Gi"
```

**Pros:**
- Assets cached in emptyDir for fast access
- Downloaded once per pod lifecycle
- Works with any storage backend

**Cons:**
- Pod startup time increases with asset size
- Requires sufficient emptyDir storage

### Option B: Azure Files PVC Mount

**Best for:** Frequently updated assets, shared datasets

```yaml
volumes:
  - name: assets-volume
    persistentVolumeClaim:
      claimName: broxiva-assets-pvc
      readOnly: true
containers:
  - name: api
    volumeMounts:
      - name: assets-volume
        mountPath: /app/assets
        readOnly: true
```

**Pros:**
- Instant asset updates (no pod restart)
- Shared across all pods
- No download time

**Cons:**
- Network latency for file access
- Requires Azure Files share
- Cost (Premium_LRS for performance)

## Environment Variables

Configure asset source in your application:

```bash
# Common
ASSET_PATH=/app/assets

# For Azure Blob
ASSET_SOURCE=blob
AZURE_STORAGE_ACCOUNT=broxivaprodstorage
AZURE_STORAGE_CONTAINER=assets-prod

# For Azure Files
ASSET_SOURCE=files
# No additional config needed - mounted via PVC
```

## Uploading Assets

### Upload to Azure Blob

```bash
# Using Azure CLI
az storage blob upload-batch \
  --account-name broxivaprodstorage \
  --destination assets-prod \
  --source ./assets/large \
  --auth-mode login

# Using azcopy (faster for large files)
azcopy copy ./assets/large/* \
  "https://broxivaprodstorage.blob.core.windows.net/assets-prod/" \
  --recursive
```

### Upload to Azure Files

```bash
# Mount the share locally
sudo mount -t cifs \
  //broxivaprodstorage.file.core.windows.net/assets-prod \
  /mnt/assets \
  -o vers=3.0,username=broxivaprodstorage,password=$KEY

# Copy files
cp -r ./assets/large/* /mnt/assets/
```

## Directory Structure

```
/app/assets/
├── models/           # ML models (.pt, .onnx, .h5)
├── embeddings/       # Vector embeddings
├── datasets/         # Training/inference data
├── media/           # Large media files
└── config/          # Large config files
```

## Kubernetes Manifests

- **Blob approach:** `infrastructure/kubernetes/base/asset-runtime-blob.yaml`
- **Files approach:** `infrastructure/kubernetes/base/asset-runtime-files.yaml`

## Security Considerations

1. **Use Workload Identity** for Azure authentication (no secrets in pods)
2. **ReadOnly mounts** prevent accidental modification
3. **Private endpoints** keep traffic within Azure network
4. **SAS tokens** with limited scope and expiry for blob access

## Monitoring

Monitor asset access and storage:

```bash
# Check blob storage metrics
az monitor metrics list \
  --resource /subscriptions/.../storageAccounts/broxivaprodstorage \
  --metric "BlobCapacity,Transactions"

# Check files share usage
az storage share show \
  --account-name broxivaprodstorage \
  --name assets-prod \
  --query "properties.quota"
```

## Troubleshooting

### Assets not found after pod start

1. Check InitContainer logs: `kubectl logs <pod> -c asset-downloader`
2. Verify storage credentials
3. Check blob container permissions

### Slow file access (Azure Files)

1. Use Premium_LRS storage tier
2. Enable private endpoint
3. Check network policies

### Out of disk space (Blob approach)

1. Increase `emptyDir.sizeLimit`
2. Clean up unused assets
3. Consider using Azure Files instead
