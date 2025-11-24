# Fix Docker Credential Helper Issue

## Problem
```
error getting credentials - err: exec: "docker-credential-desktop": executable file not found in %PATH%
```

## Solution Options

### Option 1: Fix Docker Desktop Credential Helper (Recommended)

1. **Edit Docker config file:**
   - Location: `C:\Users\[YourUsername]\.docker\config.json` (Windows)
   - Location: `~/.docker/config.json` (Linux/Mac)

2. **Remove or modify the credsStore entry:**

**Before:**
```json
{
  "auths": {},
  "credsStore": "desktop"
}
```

**After (Option A - Remove credsStore):**
```json
{
  "auths": {}
}
```

**After (Option B - Use wincred on Windows):**
```json
{
  "auths": {},
  "credsStore": "wincred"
}
```

3. **Login again:**
```bash
docker login
```

### Option 2: Use Environment Variable

```bash
# Set credential store to empty
export DOCKER_CONFIG=/tmp/docker-config
mkdir -p $DOCKER_CONFIG
echo '{"auths":{}}' > $DOCKER_CONFIG/config.json

# Now build
docker build -t citadelplatforms/citadelbuy-ecommerce:backend-latest .
```

### Option 3: Build Without Pulling Base Image (if already cached)

```bash
# If node:20-alpine is already cached locally
docker build --pull=false -t citadelplatforms/citadelbuy-ecommerce:backend-latest .
```

## Complete Manual Build Process

After fixing credentials:

```bash
# 1. Login to Docker Hub
docker login
# Username: citadelplatforms
# Password: [your-password-or-token]

# 2. Build Backend
cd citadelbuy/backend
docker build -t citadelplatforms/citadelbuy-ecommerce:backend-latest \
             -t citadelplatforms/citadelbuy-ecommerce:backend-v2.0-phase26 .

# 3. Build Frontend
cd ../frontend
docker build -t citadelplatforms/citadelbuy-ecommerce:frontend-latest \
             -t citadelplatforms/citadelbuy-ecommerce:frontend-v2.0-phase26 .

# 4. Push to Docker Hub
docker push citadelplatforms/citadelbuy-ecommerce:backend-latest
docker push citadelplatforms/citadelbuy-ecommerce:backend-v2.0-phase26
docker push citadelplatforms/citadelbuy-ecommerce:frontend-latest
docker push citadelplatforms/citadelbuy-ecommerce:frontend-v2.0-phase26
```

## Verify Success

```bash
# Check images are built
docker images | grep citadelplatforms

# Test backend image
docker run --rm citadelplatforms/citadelbuy-ecommerce:backend-latest node --version

# Test frontend image
docker run --rm citadelplatforms/citadelbuy-ecommerce:frontend-latest node --version
```

## Alternative: GitHub Actions Auto-Deploy

Create `.github/workflows/docker-publish.yml`:

```yaml
name: Docker Publish

on:
  push:
    branches: [ main ]
    paths:
      - 'citadelbuy/**'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./citadelbuy/backend
          push: true
          tags: |
            citadelplatforms/citadelbuy-ecommerce:backend-latest
            citadelplatforms/citadelbuy-ecommerce:backend-v2.0-phase26

      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./citadelbuy/frontend
          push: true
          tags: |
            citadelplatforms/citadelbuy-ecommerce:frontend-latest
            citadelplatforms/citadelbuy-ecommerce:frontend-v2.0-phase26
```

This will automatically build and push on every commit to main branch.
