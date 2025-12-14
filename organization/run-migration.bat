@echo off
REM Wrapper batch file to run the migration script
cd /d "%~dp0"

REM Run with dry-run first
echo Running migration in DRY-RUN mode...
bash migrate-cicd-to-broxiva.sh --dry-run
pause

echo.
echo Do you want to proceed with the actual migration? (Y/N)
set /p confirm=

if /i "%confirm%"=="Y" (
    echo Running migration with BACKUP...
    bash migrate-cicd-to-broxiva.sh --backup
    pause
) else (
    echo Migration cancelled.
    pause
)
