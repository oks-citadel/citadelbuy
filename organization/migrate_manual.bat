@echo off
REM CI/CD Migration Batch Script - CitadelBuy to Broxiva
REM This script performs search and replace across all workflow files

setlocal enabledelayedexpansion

echo ================================================================================
echo   CI/CD Pipeline Migration: CitadelBuy to Broxiva
echo ================================================================================
echo.

cd /d "%~dp0.github\workflows"

if not exist "*.yml" (
    echo Error: No workflow files found
    exit /b 1
)

echo Creating backup...
set BACKUP_DIR=..\..\workflows-backup-%date:~-4,4%%date:~-7,2%%date:~-10,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir "%BACKUP_DIR%" 2>nul
copy *.yml "%BACKUP_DIR%\" >nul
echo Backup created at: %BACKUP_DIR%
echo.

echo Performing replacements...
echo.

REM Use PowerShell for reliable text replacement
powershell -Command "$files = Get-ChildItem -Path '.' -Filter '*.yml'; $count = 0; foreach ($file in $files) { $content = Get-Content $file.FullName -Raw; $original = $content; $content = $content -replace 'citadelbuy', 'broxiva'; $content = $content -replace 'CitadelBuy', 'Broxiva'; $content = $content -replace 'citadelplatforms', 'broxiva'; if ($content -ne $original) { Set-Content -Path $file.FullName -Value $content -NoNewline; Write-Host \"  Modified: $($file.Name)\"; $count++ } } Write-Host \"`nTotal files modified: $count\""

echo.
echo ================================================================================
echo   Migration Complete!
echo ================================================================================
echo.
echo Next steps:
echo   1. Review changes: git diff .github/workflows/
echo   2. Verify no citadelbuy references remain
echo   3. Test workflows in development environment
echo.
echo Backup location: %BACKUP_DIR%
echo.

pause
