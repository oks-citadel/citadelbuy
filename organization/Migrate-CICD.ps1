# CI/CD Migration PowerShell Script: CitadelBuy → Broxiva
# Run this from the organization directory

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  CI/CD Pipeline Migration: CitadelBuy → Broxiva" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$workflowsDir = Join-Path $PSScriptRoot ".github\workflows"

if (-not (Test-Path $workflowsDir)) {
    Write-Host "Error: Workflows directory not found: $workflowsDir" -ForegroundColor Red
    exit 1
}

# Create backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $PSScriptRoot "workflows-backup-$timestamp"

Write-Host "Creating backup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item "$workflowsDir\*.yml" -Destination $backupDir
Write-Host "  Backup created at: $backupDir" -ForegroundColor Green
Write-Host ""

# Get all yml files
$ymlFiles = Get-ChildItem -Path $workflowsDir -Filter "*.yml"
Write-Host "Found $($ymlFiles.Count) workflow files to process" -ForegroundColor Cyan
Write-Host ""

# Count occurrences before
$totalBefore = 0
foreach ($file in $ymlFiles) {
    $content = Get-Content $file.FullName -Raw
    $totalBefore += ([regex]::Matches($content, 'citadelbuy', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
}

Write-Host "Current state:" -ForegroundColor Cyan
Write-Host "  - Total citadelbuy/CitadelBuy occurrences: $totalBefore" -ForegroundColor White
Write-Host ""

# Perform replacements
Write-Host "Performing replacements..." -ForegroundColor Yellow
Write-Host ""

$modifiedFiles = @()
$totalReplacements = 0

foreach ($file in $ymlFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content

    # Perform replacements (case-sensitive)
    $content = $content -replace 'citadelbuy', 'broxiva'
    $content = $content -replace 'CitadelBuy', 'Broxiva'
    $content = $content -replace 'citadelplatforms', 'broxiva'

    if ($content -ne $original) {
        # Count replacements in this file
        $fileReplacements = ([regex]::Matches($original, 'citadelbuy|CitadelBuy|citadelplatforms', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
        $totalReplacements += $fileReplacements

        # Write modified content back
        Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
        $modifiedFiles += $file.Name
        Write-Host "  ✓ Modified: $($file.Name) ($fileReplacements replacements)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  Migration Summary" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Green
Write-Host "Total replacements made: $totalReplacements" -ForegroundColor Green
Write-Host ""

# Count occurrences after
$totalAfter = 0
foreach ($file in $ymlFiles) {
    $content = Get-Content $file.FullName -Raw
    $totalAfter += ([regex]::Matches($content, 'citadelbuy', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
}

Write-Host "Post-migration state:" -ForegroundColor Cyan
Write-Host "  - Remaining citadelbuy/CitadelBuy occurrences: $totalAfter" -ForegroundColor $(if ($totalAfter -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($totalAfter -eq 0) {
    Write-Host "SUCCESS: All references migrated to Broxiva!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Some citadelbuy references remain. Please review manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Modified files:" -ForegroundColor Cyan
foreach ($file in $modifiedFiles | Sort-Object) {
    Write-Host "  - $file" -ForegroundColor White
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review changes: git diff .github/workflows/" -ForegroundColor White
Write-Host "  2. Verify workflows: Check the modified files" -ForegroundColor White
Write-Host "  3. Test in development environment" -ForegroundColor White
Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Yellow
Write-Host "  To rollback: Copy-Item '$backupDir\*.yml' -Destination '$workflowsDir' -Force" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  Migration Script Completed" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
