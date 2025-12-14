@echo off
REM ==========================================
REM Broxiva Platform - Docker Image Build Script
REM Windows Batch version
REM ==========================================

setlocal enabledelayedexpansion

echo ========================================
echo Broxiva Platform - Docker Image Builder
echo ========================================
echo.

REM Set base directory
set BASE_DIR=%~dp0
cd /d "%BASE_DIR%"

REM Azure Container Registry details
set ACR_NAME=broxivaacr.azurecr.io
set VERSION=latest

REM Step 1: Check Docker installation
echo [INFO] Step 1: Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)
echo [SUCCESS] Docker is installed

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running. Please start Docker Desktop.
    exit /b 1
)
echo [SUCCESS] Docker daemon is running
echo.

REM Step 2: Build main application images
echo [INFO] Step 2: Building main application images...
echo.

REM Build Web Application
echo [INFO] Building broxiva-web...
docker build -f "%BASE_DIR%apps\web\Dockerfile.production" ^
    -t "broxiva-web:%VERSION%" ^
    -t "%ACR_NAME%/broxiva-web:%VERSION%" ^
    --build-arg NEXT_PUBLIC_API_URL=https://api.broxiva.com ^
    --build-arg NEXT_PUBLIC_APP_NAME=Broxiva ^
    "%BASE_DIR%apps\web"

if errorlevel 1 (
    echo [ERROR] Failed to build broxiva-web
) else (
    echo [SUCCESS] broxiva-web built successfully
)
echo.

REM Build API Application
echo [INFO] Building broxiva-api...
docker build -f "%BASE_DIR%apps\api\Dockerfile.production" ^
    -t "broxiva-api:%VERSION%" ^
    -t "%ACR_NAME%/broxiva-api:%VERSION%" ^
    "%BASE_DIR%apps\api"

if errorlevel 1 (
    echo [ERROR] Failed to build broxiva-api
) else (
    echo [SUCCESS] broxiva-api built successfully
)
echo.

REM Step 3: Build microservices
echo [INFO] Step 3: Building microservices...
echo.

REM Define services array (service:port)
set services[0]=ai-agents:8020
set services[1]=ai-engine:8010
set services[2]=analytics:8005
set services[3]=chatbot:8009
set services[4]=fraud-detection:8008
set services[5]=inventory:8004
set services[6]=media:8006
set services[7]=notification:8003
set services[8]=personalization:8002
set services[9]=pricing:8011
set services[10]=recommendation:8001
set services[11]=search:8007
set services[12]=supplier-integration:8012

REM Build each service
for /L %%i in (0,1,12) do (
    for /F "tokens=1 delims=:" %%s in ("!services[%%i]!") do (
        set service_name=%%s
        set service_dir=%BASE_DIR%apps\services\!service_name!

        echo [INFO] Building broxiva-!service_name!...

        if exist "!service_dir!\Dockerfile" (
            docker build -f "!service_dir!\Dockerfile" ^
                -t "broxiva-!service_name!:%VERSION%" ^
                -t "%ACR_NAME%/broxiva-!service_name!:%VERSION%" ^
                "!service_dir!"

            if errorlevel 1 (
                echo [ERROR] Failed to build broxiva-!service_name!
            ) else (
                echo [SUCCESS] broxiva-!service_name! built successfully
            )
        ) else (
            echo [WARNING] Dockerfile not found for !service_name!
        )
        echo.
    )
)

REM Step 4: List all built images
echo [INFO] Step 4: Listing all Broxiva images...
echo.
docker images | findstr broxiva
echo.

REM Step 5: Display summary
echo ========================================
echo Build Summary
echo ========================================
echo.

REM Count images
set count=0
for /f %%i in ('docker images --format "{{.Repository}}" ^| findstr broxiva ^| find /c /v ""') do set count=%%i

echo [SUCCESS] Total Broxiva images built: %count%
echo.

echo Main Applications:
echo   - broxiva-web:%VERSION%
echo   - broxiva-api:%VERSION%
echo.

echo Microservices:
echo   - broxiva-ai-agents:%VERSION%
echo   - broxiva-ai-engine:%VERSION%
echo   - broxiva-analytics:%VERSION%
echo   - broxiva-chatbot:%VERSION%
echo   - broxiva-fraud-detection:%VERSION%
echo   - broxiva-inventory:%VERSION%
echo   - broxiva-media:%VERSION%
echo   - broxiva-notification:%VERSION%
echo   - broxiva-personalization:%VERSION%
echo   - broxiva-pricing:%VERSION%
echo   - broxiva-recommendation:%VERSION%
echo   - broxiva-search:%VERSION%
echo   - broxiva-supplier-integration:%VERSION%
echo.

echo ========================================
echo Next Steps:
echo ========================================
echo 1. Login to Azure Container Registry:
echo    az acr login --name broxivaacr
echo.
echo 2. Push images to ACR:
echo    docker push %ACR_NAME%/broxiva-web:%VERSION%
echo    docker push %ACR_NAME%/broxiva-api:%VERSION%
echo    # ... and all microservices
echo.
echo 3. Or push all images:
echo    for /f "tokens=*" %%i in ('docker images --format "{{.Repository}}:{{.Tag}}" ^| findstr broxivaacr') do docker push %%i
echo.

echo [SUCCESS] Build script completed!
pause
