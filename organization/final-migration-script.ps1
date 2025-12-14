# Broxiva Final Migration Script (PowerShell)
# This script performs the final renaming from CitadelBuy to Broxiva

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Broxiva Final Migration Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Change to organization directory
Set-Location $PSScriptRoot

function Replace-InFile {
    param (
        [string]$FilePath,
        [hashtable]$Replacements
    )

    try {
        $content = Get-Content $FilePath -Raw -ErrorAction Stop
        $modified = $false

        foreach ($key in $Replacements.Keys) {
            if ($content -match $key) {
                $content = $content -replace $key, $Replacements[$key]
                $modified = $true
            }
        }

        if ($modified) {
            Set-Content -Path $FilePath -Value $content -NoNewline
            Write-Host "  Updated: $FilePath" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  Error updating $FilePath : $_" -ForegroundColor Red
    }
}

Write-Host "Step 1: Updating package.json files..." -ForegroundColor Yellow
$packageFiles = Get-ChildItem -Path . -Filter "package.json" -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules|\.expo|\.next" }

$packageReplacements = @{
    '@citadelbuy/' = '@broxiva/'
    'citadelbuy-backend' = 'broxiva-backend'
    'CitadelBuy platform' = 'Broxiva platform'
    '"citadelbuy"' = '"broxiva"'
}

foreach ($file in $packageFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $packageReplacements
}

Write-Host "`nStep 2: Updating mobile app configuration files..." -ForegroundColor Yellow
$mobileConfigFiles = @(
    "apps\mobile\app.json",
    "apps\mobile\app.config.json",
    "apps\mobile\eas.json"
)

$mobileReplacements = @{
    'CitadelBuy' = 'Broxiva'
    'citadelbuy' = 'broxiva'
    'com\.citadelbuy\.app' = 'com.broxiva.app'
}

foreach ($file in $mobileConfigFiles) {
    if (Test-Path $file) {
        Replace-InFile -FilePath $file -Replacements $mobileReplacements
    }
}

Write-Host "`nStep 3: Updating TypeScript source files..." -ForegroundColor Yellow
$tsFiles = Get-ChildItem -Path . -Include "*.ts","*.tsx" -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules|\.expo|\.next" }

$tsReplacements = @{
    'citadelbuy_access_token' = 'broxiva_access_token'
    'citadelbuy_refresh_token' = 'broxiva_refresh_token'
    'citadelbuy_language' = 'broxiva_language'
    'CITADELBUY_LANG' = 'BROXIVA_LANG'
    'citadelbuy_session_id' = 'broxiva_session_id'
    '@citadelbuy\.com' = '@broxiva.com'
    'admin@citadelbuy' = 'admin@broxiva'
    'customer@citadelbuy' = 'customer@broxiva'
    'test@citadelbuy' = 'test@broxiva'
    'class CitadelBuyAI' = 'class BroxivaAI'
    'export default CitadelBuyAI' = 'export default BroxivaAI'
    'CitadelBuy' = 'Broxiva'
}

foreach ($file in $tsFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $tsReplacements
}

Write-Host "`nStep 4: Updating Terraform files..." -ForegroundColor Yellow
$tfFiles = Get-ChildItem -Path "infrastructure" -Filter "*.tf" -Recurse -ErrorAction SilentlyContinue

$tfReplacements = @{
    'CitadelBuy' = 'Broxiva'
    'citadelbuy' = 'broxiva'
    'citadelbuy_admin' = 'broxiva_admin'
}

foreach ($file in $tfFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $tfReplacements
}

Write-Host "`nStep 5: Updating YAML/YML configuration files..." -ForegroundColor Yellow
$yamlFiles = Get-ChildItem -Path . -Include "*.yml","*.yaml" -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules" }

$yamlReplacements = @{
    'citadelbuy' = 'broxiva'
    'CitadelBuy' = 'Broxiva'
    'citadelbuyacr' = 'broxivaacr'
    'staging\.citadelbuy\.com' = 'staging.broxiva.com'
    'www\.citadelbuy\.com' = 'www.broxiva.com'
    'citadelbuy\.com' = 'broxiva.com'
    'CITADELBUY' = 'BROXIVA'
}

foreach ($file in $yamlFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $yamlReplacements
}

Write-Host "`nStep 6: Updating Vault policies..." -ForegroundColor Yellow
$vaultFiles = Get-ChildItem -Path "infrastructure\vault" -Filter "*.hcl" -Recurse -ErrorAction SilentlyContinue

$vaultReplacements = @{
    'citadelbuy' = 'broxiva'
    'CitadelBuy' = 'Broxiva'
}

foreach ($file in $vaultFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $vaultReplacements
}

Write-Host "`nStep 7: Updating Docker configuration..." -ForegroundColor Yellow
$dockerFiles = Get-ChildItem -Path "infrastructure\docker" -Filter "docker-compose*.yml" -Recurse -ErrorAction SilentlyContinue

$dockerReplacements = @{
    'citadelbuy' = 'broxiva'
    'CitadelBuy' = 'Broxiva'
    'com\.citadelbuy\.' = 'com.broxiva.'
}

foreach ($file in $dockerFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $dockerReplacements
}

Write-Host "`nStep 8: Updating Nginx configuration..." -ForegroundColor Yellow
$nginxFiles = Get-ChildItem -Path "infrastructure" -Filter "*.conf" -Recurse -ErrorAction SilentlyContinue

$nginxReplacements = @{
    'citadelbuy' = 'broxiva'
    'CitadelBuy' = 'Broxiva'
}

foreach ($file in $nginxFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $nginxReplacements
}

Write-Host "`nStep 9: Updating scripts..." -ForegroundColor Yellow
$scriptFiles = Get-ChildItem -Path "scripts" -Include "*.sh","*.ps1" -Recurse -ErrorAction SilentlyContinue

$scriptReplacements = @{
    'citadelbuy' = 'broxiva'
    'CitadelBuy' = 'Broxiva'
    'CITADELBUY' = 'BROXIVA'
}

foreach ($file in $scriptFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $scriptReplacements
}

Write-Host "`nStep 10: Updating test files..." -ForegroundColor Yellow
$testFiles = Get-ChildItem -Path "tests" -Include "*.json","*.js","*.ts" -Recurse -ErrorAction SilentlyContinue

$testReplacements = @{
    'citadelbuy' = 'broxiva'
    'CitadelBuy' = 'Broxiva'
    'citadelbuy_' = 'broxiva_'
}

foreach ($file in $testFiles) {
    Replace-InFile -FilePath $file.FullName -Replacements $testReplacements
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files updated successfully." -ForegroundColor Green
Write-Host "Note: .expo cache files were excluded and can be regenerated." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes with: git diff" -ForegroundColor White
Write-Host "2. Run: pnpm install (to update lock files)" -ForegroundColor White
Write-Host "3. Run tests to verify everything works" -ForegroundColor White
Write-Host "4. Commit the changes" -ForegroundColor White
Write-Host ""
