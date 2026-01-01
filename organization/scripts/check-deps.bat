@echo off
REM Dependency Check Script for Broxiva (Windows)
REM This script checks for outdated packages and security vulnerabilities across all workspaces

setlocal enabledelayedexpansion

REM Get script directory
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set REPORT_FILE=%PROJECT_ROOT%\dependency-check-report.txt

REM Get timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%:%datetime:~12,2%

echo ========================================
echo Broxiva Dependency Check
echo ========================================
echo Timestamp: %TIMESTAMP%
echo.

REM Initialize report
echo Broxiva Dependency Check Report > "%REPORT_FILE%"
echo =================================== >> "%REPORT_FILE%"
echo Generated: %TIMESTAMP% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

REM Check if pnpm is installed
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: pnpm is not installed
    echo Please install pnpm: npm install -g pnpm
    exit /b 1
)

for /f "delims=" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
echo [OK] pnpm is installed: %PNPM_VERSION%

cd /d "%PROJECT_ROOT%"

REM Check root workspace
echo.
echo [CHECK] Root Workspace - Outdated Packages
echo =========================================== >> "%REPORT_FILE%"
echo Checking outdated packages: Root Workspace >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
pnpm outdated >> "%REPORT_FILE%" 2>&1

echo.
echo [CHECK] Root Workspace - Security Audit
echo Root Workspace Security Audit >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
pnpm audit --audit-level=low >> "%REPORT_FILE%" 2>&1

REM Check API workspace
cd /d "%PROJECT_ROOT%\apps\api"
echo.
echo [CHECK] API Workspace - Outdated Packages
echo =========================================== >> "%REPORT_FILE%"
echo Checking outdated packages: API Workspace >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
pnpm outdated >> "%REPORT_FILE%" 2>&1

echo.
echo [CHECK] API Workspace - Security Audit
echo API Workspace Security Audit >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
pnpm audit --audit-level=low >> "%REPORT_FILE%" 2>&1

REM Check Web workspace
cd /d "%PROJECT_ROOT%\apps\web"
echo.
echo [CHECK] Web Workspace - Outdated Packages
echo =========================================== >> "%REPORT_FILE%"
echo Checking outdated packages: Web Workspace >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
pnpm outdated >> "%REPORT_FILE%" 2>&1

echo.
echo [CHECK] Web Workspace - Security Audit
echo Web Workspace Security Audit >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
pnpm audit --audit-level=low >> "%REPORT_FILE%" 2>&1

REM Generate recommendations
cd /d "%PROJECT_ROOT%"
echo. >> "%REPORT_FILE%"
echo =========================================== >> "%REPORT_FILE%"
echo Recommendations >> "%REPORT_FILE%"
echo =========================================== >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo To update dependencies: >> "%REPORT_FILE%"
echo ----------------------- >> "%REPORT_FILE%"
echo 1. For security patches: >> "%REPORT_FILE%"
echo    pnpm audit --fix >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo 2. For outdated packages (patch versions): >> "%REPORT_FILE%"
echo    pnpm update --patch >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo 3. For outdated packages (minor versions): >> "%REPORT_FILE%"
echo    pnpm update --minor >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo 4. For major version updates: >> "%REPORT_FILE%"
echo    pnpm update --latest ^<package-name^> >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Testing requirements: >> "%REPORT_FILE%"
echo --------------------- >> "%REPORT_FILE%"
echo - Always run tests after updates: pnpm test >> "%REPORT_FILE%"
echo - Run E2E tests: pnpm test:e2e >> "%REPORT_FILE%"
echo - Check types: pnpm type-check >> "%REPORT_FILE%"
echo - Verify build: pnpm build >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo For more information, see docs/DEPENDENCY_MANAGEMENT.md >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

REM Final output
echo.
echo ========================================
echo Report saved to: %REPORT_FILE%
echo ========================================
echo.
echo Check complete! Please review the report file.
echo.

endlocal
