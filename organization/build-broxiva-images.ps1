# ==========================================
# Broxiva Platform - Docker Image Build Script
# PowerShell version for Windows
# ==========================================

Write-Host "========================================"
Write-Host "Broxiva Platform - Docker Image Builder"
Write-Host "========================================"
Write-Host ""

# Set error action preference
$ErrorActionPreference = "Stop"

# Define base directory
$BASE_DIR = "C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization"
Set-Location $BASE_DIR

# Azure Container Registry details
$ACR_NAME = "broxivaacr.azurecr.io"
$VERSION = "latest"

# Color coding functions
function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

# Step 1: Check Docker installation
Write-Info "Step 1: Checking Docker installation..."
try {
    $dockerVersion = docker --version
    Write-Success "Docker is installed: $dockerVersion"

    docker info | Out-Null
    Write-Success "Docker daemon is running"
} catch {
    Write-Error "Docker is not installed or not running. Please install/start Docker Desktop."
    exit 1
}

Write-Host ""

# Step 2: Build main application images
Write-Info "Step 2: Building main application images..."
Write-Host ""

# Build Web Application (Next.js)
Write-Info "Building broxiva-web..."
try {
    docker build -f "$BASE_DIR\apps\web\Dockerfile.production" `
        -t "broxiva-web:$VERSION" `
        -t "$ACR_NAME/broxiva-web:$VERSION" `
        --build-arg NEXT_PUBLIC_API_URL="https://api.broxiva.com" `
        --build-arg NEXT_PUBLIC_APP_NAME="Broxiva" `
        "$BASE_DIR\apps\web"

    Write-Success "broxiva-web built successfully"
} catch {
    Write-Error "Failed to build broxiva-web: $_"
}

Write-Host ""

# Build API Application (NestJS)
Write-Info "Building broxiva-api..."
try {
    docker build -f "$BASE_DIR\apps\api\Dockerfile.production" `
        -t "broxiva-api:$VERSION" `
        -t "$ACR_NAME/broxiva-api:$VERSION" `
        "$BASE_DIR\apps\api"

    Write-Success "broxiva-api built successfully"
} catch {
    Write-Error "Failed to build broxiva-api: $_"
}

Write-Host ""

# Step 3: Build microservices
Write-Info "Step 3: Building microservices..."
Write-Host ""

# Define all microservices
$services = @(
    @{Name="ai-agents"; Port="8020"},
    @{Name="ai-engine"; Port="8010"},
    @{Name="analytics"; Port="8005"},
    @{Name="chatbot"; Port="8009"},
    @{Name="fraud-detection"; Port="8008"},
    @{Name="inventory"; Port="8004"},
    @{Name="media"; Port="8006"},
    @{Name="notification"; Port="8003"},
    @{Name="personalization"; Port="8002"},
    @{Name="pricing"; Port="8011"},
    @{Name="recommendation"; Port="8001"},
    @{Name="search"; Port="8007"},
    @{Name="supplier-integration"; Port="8012"}
)

foreach ($service in $services) {
    $serviceName = $service.Name
    $serviceDir = "$BASE_DIR\apps\services\$serviceName"

    Write-Info "Building broxiva-$serviceName..."

    if (Test-Path "$serviceDir\Dockerfile") {
        try {
            docker build -f "$serviceDir\Dockerfile" `
                -t "broxiva-$serviceName:$VERSION" `
                -t "$ACR_NAME/broxiva-$serviceName:$VERSION" `
                $serviceDir

            Write-Success "broxiva-$serviceName built successfully"
        } catch {
            Write-Error "Failed to build broxiva-$serviceName: $_"
        }
    } else {
        Write-Warning "Dockerfile not found for $serviceName at $serviceDir"
    }

    Write-Host ""
}

# Step 4: List all built images
Write-Info "Step 4: Listing all Broxiva images..."
Write-Host ""

docker images | Select-String "broxiva"

Write-Host ""

# Step 5: Display summary
Write-Info "========================================"
Write-Info "Build Summary"
Write-Info "========================================"

$allImages = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "broxiva"
$imageCount = ($allImages | Measure-Object).Count

Write-Success "Total Broxiva images built: $imageCount"
Write-Host ""

Write-Info "Main Applications:"
Write-Host "  - broxiva-web:$VERSION"
Write-Host "  - broxiva-api:$VERSION"
Write-Host ""

Write-Info "Microservices:"
foreach ($service in $services) {
    Write-Host "  - broxiva-$($service.Name):$VERSION"
}

Write-Host ""
Write-Info "========================================"
Write-Info "Next Steps:"
Write-Info "========================================"
Write-Host "1. Login to Azure Container Registry:"
Write-Host "   az acr login --name broxivaacr"
Write-Host ""
Write-Host "2. Push images to ACR:"
Write-Host "   docker push $ACR_NAME/broxiva-web:$VERSION"
Write-Host "   docker push $ACR_NAME/broxiva-api:$VERSION"
Write-Host "   # ... and all microservices"
Write-Host ""
Write-Host "3. Or use docker-compose to push all images:"
Write-Host "   docker-compose -f docker-compose.production.yml push"
Write-Host ""

Write-Success "Build script completed!"
