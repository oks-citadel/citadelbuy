################################################################################
# CitadelBuy Production Secrets Generator (PowerShell)
################################################################################
# This script generates cryptographically secure secrets for production use.
#
# Usage:
#   .\generate-secrets.ps1 [OPTIONS]
#
# Options:
#   -OutputFile FILE    Write secrets to specified file (default: .env.secrets)
#   -Format FORMAT      Output format: env, json, yaml (default: env)
#   -Validate           Validate existing secrets instead of generating new ones
#   -Help               Show this help message
#
# Security Requirements:
#   - JWT_SECRET: Minimum 64 characters (base64 encoded)
#   - JWT_REFRESH_SECRET: Minimum 64 characters (MUST differ from JWT_SECRET)
#   - ENCRYPTION_KEY: Exactly 64 hex characters (32 bytes for AES-256)
#   - All passwords: Minimum 32 characters
#
################################################################################

param(
    [string]$OutputFile = ".env.secrets",
    [ValidateSet("env", "json", "yaml")]
    [string]$Format = "env",
    [switch]$Validate,
    [switch]$Help
)

# Requires PowerShell 5.1 or higher
#Requires -Version 5.1

################################################################################
# Helper Functions
################################################################################

function Write-Header {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  " -NoNewline -ForegroundColor Cyan
    Write-Host "CitadelBuy Production Secrets Generator (PowerShell)" -NoNewline -ForegroundColor Blue
    Write-Host "       ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "═══ $Title ═══" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    @"
CitadelBuy Production Secrets Generator (PowerShell)

Usage:
    .\generate-secrets.ps1 [OPTIONS]

Options:
    -OutputFile FILE    Write secrets to specified file (default: .env.secrets)
    -Format FORMAT      Output format: env, json, yaml (default: env)
    -Validate           Validate existing secrets instead of generating
    -Help               Show this help message

Examples:
    # Generate secrets to default file
    .\generate-secrets.ps1

    # Generate secrets to custom file
    .\generate-secrets.ps1 -OutputFile .env.production

    # Generate secrets in JSON format
    .\generate-secrets.ps1 -Format json -OutputFile secrets.json

    # Validate existing secrets
    .\generate-secrets.ps1 -Validate -OutputFile .env

Security Notes:
    - All secrets are generated using .NET cryptographic functions
    - JWT secrets are 64+ characters (base64 encoded)
    - Encryption keys are 64 hex characters (32 bytes)
    - Passwords are 32+ characters with high entropy
    - NEVER commit generated secrets to version control
    - Store production secrets in a secure secrets manager

"@
}

################################################################################
# Secret Generation Functions
################################################################################

function New-RandomBytes {
    param([int]$Length)

    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()

    return $bytes
}

function New-JwtSecret {
    # Generate 64-character base64 JWT secret (48 bytes = 64 base64 chars)
    $bytes = New-RandomBytes -Length 48
    return [Convert]::ToBase64String($bytes)
}

function New-EncryptionKey {
    # Generate 64-character hex encryption key (32 bytes)
    $bytes = New-RandomBytes -Length 32
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

function New-Password {
    param([int]$Length = 32)

    # Generate password with high entropy
    $bytes = New-RandomBytes -Length $Length
    $base64 = [Convert]::ToBase64String($bytes)

    # Take first $Length characters
    return $base64.Substring(0, [Math]::Min($Length, $base64.Length))
}

function New-StrongPassword {
    # Generate 48-character password for critical services
    return New-Password -Length 48
}

function New-ApiKey {
    param([string]$Prefix)

    $bytes = New-RandomBytes -Length 30
    $random = [Convert]::ToBase64String($bytes) -replace '[/+=]', ''
    $random = $random.Substring(0, [Math]::Min(40, $random.Length))

    return "${Prefix}_${random}"
}

################################################################################
# Validation Functions
################################################################################

function Test-JwtSecret {
    param(
        [string]$Secret,
        [string]$Name
    )

    $length = $Secret.Length
    $valid = $true

    if ($length -lt 64) {
        Write-ErrorMsg "${Name}: Too short ($length chars, minimum 64 required)"
        $valid = $false
    }

    # Check for common weak patterns
    $weakPatterns = @("changeme", "your-", "example", "test", "placeholder")
    foreach ($pattern in $weakPatterns) {
        if ($Secret -like "*$pattern*") {
            Write-ErrorMsg "${Name}: Contains placeholder or weak pattern"
            $valid = $false
            break
        }
    }

    if ($valid) {
        Write-Success "${Name}: Valid ($length chars)"
    }

    return $valid
}

function Test-EncryptionKey {
    param([string]$Key)

    $length = $Key.Length
    $valid = $true

    if ($length -ne 64) {
        Write-ErrorMsg "ENCRYPTION_KEY: Invalid length ($length chars, must be exactly 64)"
        $valid = $false
    }

    # Check if valid hex
    if ($Key -notmatch "^[0-9a-fA-F]{64}$") {
        Write-ErrorMsg "ENCRYPTION_KEY: Not valid hexadecimal"
        $valid = $false
    }

    # Check for weak patterns
    if ($Key -match "^0+$" -or $Key -match "^1+$" -or $Key -match "^(01)+$") {
        Write-ErrorMsg "ENCRYPTION_KEY: Contains weak pattern"
        $valid = $false
    }

    if ($valid) {
        Write-Success "ENCRYPTION_KEY: Valid (64 hex chars)"
    }

    return $valid
}

function Test-Password {
    param(
        [string]$Password,
        [string]$Name
    )

    $length = $Password.Length
    $valid = $true

    if ($length -lt 32) {
        Write-ErrorMsg "${Name}: Too short ($length chars, minimum 32 required)"
        $valid = $false
    }

    # Check for common weak patterns
    $weakPatterns = @("password", "changeme", "your_", "admin", "test")
    foreach ($pattern in $weakPatterns) {
        if ($Password -like "*$pattern*") {
            Write-ErrorMsg "${Name}: Contains weak or placeholder pattern"
            $valid = $false
            break
        }
    }

    if ($valid) {
        Write-Success "${Name}: Valid ($length chars)"
    }

    return $valid
}

function Test-SecretsFile {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        Write-ErrorMsg "File not found: $FilePath"
        return $false
    }

    Write-Section "Validating Secrets File: $FilePath"

    $validationFailed = $false
    $secrets = @{}

    # Read file and parse environment variables
    Get-Content $FilePath | ForEach-Object {
        $line = $_.Trim()

        # Skip comments and empty lines
        if ($line -match "^#" -or $line -eq "") {
            return
        }

        # Parse KEY=VALUE
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim() -replace '^"', '' -replace '"$', '' -replace "^'", "" -replace "'$", ""

            $secrets[$key] = $value

            # Validate based on key name
            switch -Wildcard ($key) {
                "JWT_SECRET" {
                    if (-not (Test-JwtSecret -Secret $value -Name "JWT_SECRET")) {
                        $validationFailed = $true
                    }
                }
                "JWT_REFRESH_SECRET" {
                    if (-not (Test-JwtSecret -Secret $value -Name "JWT_REFRESH_SECRET")) {
                        $validationFailed = $true
                    }
                }
                { $_ -in @("ENCRYPTION_KEY", "KYC_ENCRYPTION_KEY") } {
                    if (-not (Test-EncryptionKey -Key $value)) {
                        $validationFailed = $true
                    }
                }
                "*PASSWORD*" {
                    if (-not (Test-Password -Password $value -Name $key)) {
                        $validationFailed = $true
                    }
                }
            }
        }
    }

    # Check that JWT secrets are different
    if ($secrets.ContainsKey("JWT_SECRET") -and $secrets.ContainsKey("JWT_REFRESH_SECRET")) {
        if ($secrets["JWT_SECRET"] -eq $secrets["JWT_REFRESH_SECRET"]) {
            Write-ErrorMsg "JWT_SECRET and JWT_REFRESH_SECRET must be different!"
            $validationFailed = $true
        }
    }

    Write-Host ""
    if ($validationFailed) {
        Write-ErrorMsg "Validation failed! Please fix the issues above."
        return $false
    }
    else {
        Write-Success "All secrets validated successfully!"
        return $true
    }
}

################################################################################
# Output Functions
################################################################################

function Write-EnvFormat {
    param(
        [string]$OutputFile,
        [hashtable]$Secrets
    )

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss UTC")

    $content = @"
################################################################################
# CitadelBuy Production Secrets
################################################################################
# Generated: $timestamp
#
# SECURITY WARNING:
#   - NEVER commit this file to version control
#   - Store securely in production secrets manager
#   - Rotate secrets regularly (every 90 days recommended)
#   - Use different secrets for dev/staging/production
#
################################################################################

# =============================================================================
# JWT Authentication Secrets
# =============================================================================
# CRITICAL: These secrets sign and verify JWT tokens
# If compromised, attackers can forge authentication tokens
# Must be at least 64 characters, cryptographically random
# Must be different from each other
JWT_SECRET=$($Secrets.JWT_SECRET)
JWT_REFRESH_SECRET=$($Secrets.JWT_REFRESH_SECRET)
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# =============================================================================
# Encryption Keys
# =============================================================================
# CRITICAL: Used for encrypting sensitive data (KYC, PII)
# Must be exactly 64 hex characters (32 bytes for AES-256)
# If lost, encrypted data cannot be recovered
# If compromised, all encrypted data is at risk
ENCRYPTION_KEY=$($Secrets.ENCRYPTION_KEY)
KYC_ENCRYPTION_KEY=$($Secrets.KYC_ENCRYPTION_KEY)

# =============================================================================
# Database Credentials
# =============================================================================
# PostgreSQL database password
# Used in DATABASE_URL connection string
POSTGRES_USER=citadelbuy
POSTGRES_PASSWORD=$($Secrets.POSTGRES_PASSWORD)
POSTGRES_DB=citadelbuy_production

# Full database connection URL
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://citadelbuy:$($Secrets.POSTGRES_PASSWORD)@localhost:5432/citadelbuy_production?schema=public

# =============================================================================
# Redis Cache/Session Store
# =============================================================================
# Redis password for cache and session storage
REDIS_PASSWORD=$($Secrets.REDIS_PASSWORD)
REDIS_URL=redis://:$($Secrets.REDIS_PASSWORD)@localhost:6379

# =============================================================================
# Session Secret
# =============================================================================
# Used for session cookie signing
SESSION_SECRET=$($Secrets.SESSION_SECRET)

# =============================================================================
# Message Queue (RabbitMQ)
# =============================================================================
RABBITMQ_USER=citadelbuy
RABBITMQ_PASSWORD=$($Secrets.RABBITMQ_PASSWORD)
RABBITMQ_URL=amqp://citadelbuy:$($Secrets.RABBITMQ_PASSWORD)@localhost:5672

# =============================================================================
# Object Storage (MinIO/S3-compatible)
# =============================================================================
MINIO_ROOT_USER=citadelbuy_admin
MINIO_ROOT_PASSWORD=$($Secrets.MINIO_ROOT_PASSWORD)
MINIO_ACCESS_KEY=$($Secrets.MINIO_ACCESS_KEY)
MINIO_SECRET_KEY=$($Secrets.MINIO_SECRET_KEY)

# =============================================================================
# Admin Dashboard Credentials
# =============================================================================
# Grafana monitoring dashboard
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$($Secrets.GRAFANA_ADMIN_PASSWORD)

# pgAdmin database management
PGADMIN_DEFAULT_EMAIL=admin@citadelbuy.com
PGADMIN_DEFAULT_PASSWORD=$($Secrets.PGADMIN_DEFAULT_PASSWORD)

# =============================================================================
# API Keys (Internal Services)
# =============================================================================
# Internal API keys for service-to-service communication
INTERNAL_API_KEY=$($Secrets.INTERNAL_API_KEY)
WEBHOOK_SECRET=$($Secrets.WEBHOOK_SECRET)

# =============================================================================
# Elasticsearch (Search Service)
# =============================================================================
ELASTICSEARCH_PASSWORD=$($Secrets.ELASTICSEARCH_PASSWORD)

# =============================================================================
# NOTES
# =============================================================================
# 1. Copy this file to your secure location
# 2. Add to .gitignore to prevent accidental commits
# 3. In production, store in secrets manager:
#    - AWS Secrets Manager
#    - Azure Key Vault
#    - Google Secret Manager
#    - HashiCorp Vault
# 4. Set up secret rotation schedule (90 days recommended)
# 5. Monitor for unauthorized access attempts
# 6. Keep backups in secure, encrypted storage
#
################################################################################
"@

    Set-Content -Path $OutputFile -Value $content -Encoding UTF8
    Write-Success "Secrets written to: $OutputFile"
}

function Write-JsonFormat {
    param(
        [string]$OutputFile,
        [hashtable]$Secrets
    )

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss UTC")

    $object = @{
        _meta = @{
            generated = $timestamp
            version = "1.0.0"
            warning = "NEVER commit this file to version control"
        }
        authentication = @{
            jwt_secret = $Secrets.JWT_SECRET
            jwt_refresh_secret = $Secrets.JWT_REFRESH_SECRET
            jwt_expires_in = "7d"
            jwt_refresh_expires_in = "30d"
            session_secret = $Secrets.SESSION_SECRET
        }
        encryption = @{
            encryption_key = $Secrets.ENCRYPTION_KEY
            kyc_encryption_key = $Secrets.KYC_ENCRYPTION_KEY
        }
        database = @{
            postgres_user = "citadelbuy"
            postgres_password = $Secrets.POSTGRES_PASSWORD
            postgres_db = "citadelbuy_production"
            database_url = "postgresql://citadelbuy:$($Secrets.POSTGRES_PASSWORD)@localhost:5432/citadelbuy_production?schema=public"
        }
        cache = @{
            redis_password = $Secrets.REDIS_PASSWORD
            redis_url = "redis://:$($Secrets.REDIS_PASSWORD)@localhost:6379"
        }
        message_queue = @{
            rabbitmq_user = "citadelbuy"
            rabbitmq_password = $Secrets.RABBITMQ_PASSWORD
            rabbitmq_url = "amqp://citadelbuy:$($Secrets.RABBITMQ_PASSWORD)@localhost:5672"
        }
        storage = @{
            minio_root_user = "citadelbuy_admin"
            minio_root_password = $Secrets.MINIO_ROOT_PASSWORD
            minio_access_key = $Secrets.MINIO_ACCESS_KEY
            minio_secret_key = $Secrets.MINIO_SECRET_KEY
        }
        admin_tools = @{
            grafana_admin_user = "admin"
            grafana_admin_password = $Secrets.GRAFANA_ADMIN_PASSWORD
            pgadmin_default_email = "admin@citadelbuy.com"
            pgadmin_default_password = $Secrets.PGADMIN_DEFAULT_PASSWORD
        }
        internal = @{
            internal_api_key = $Secrets.INTERNAL_API_KEY
            webhook_secret = $Secrets.WEBHOOK_SECRET
        }
        search = @{
            elasticsearch_password = $Secrets.ELASTICSEARCH_PASSWORD
        }
    }

    $json = $object | ConvertTo-Json -Depth 10
    Set-Content -Path $OutputFile -Value $json -Encoding UTF8
    Write-Success "Secrets written to: $OutputFile (JSON format)"
}

function Write-YamlFormat {
    param(
        [string]$OutputFile,
        [hashtable]$Secrets
    )

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss UTC")

    $content = @"
# CitadelBuy Production Secrets
# Generated: $timestamp
# WARNING: NEVER commit this file to version control

meta:
  generated: "$timestamp"
  version: "1.0.0"

authentication:
  jwt_secret: "$($Secrets.JWT_SECRET)"
  jwt_refresh_secret: "$($Secrets.JWT_REFRESH_SECRET)"
  jwt_expires_in: "7d"
  jwt_refresh_expires_in: "30d"
  session_secret: "$($Secrets.SESSION_SECRET)"

encryption:
  encryption_key: "$($Secrets.ENCRYPTION_KEY)"
  kyc_encryption_key: "$($Secrets.KYC_ENCRYPTION_KEY)"

database:
  postgres_user: "citadelbuy"
  postgres_password: "$($Secrets.POSTGRES_PASSWORD)"
  postgres_db: "citadelbuy_production"
  database_url: "postgresql://citadelbuy:$($Secrets.POSTGRES_PASSWORD)@localhost:5432/citadelbuy_production?schema=public"

cache:
  redis_password: "$($Secrets.REDIS_PASSWORD)"
  redis_url: "redis://:$($Secrets.REDIS_PASSWORD)@localhost:6379"

message_queue:
  rabbitmq_user: "citadelbuy"
  rabbitmq_password: "$($Secrets.RABBITMQ_PASSWORD)"
  rabbitmq_url: "amqp://citadelbuy:$($Secrets.RABBITMQ_PASSWORD)@localhost:5672"

storage:
  minio_root_user: "citadelbuy_admin"
  minio_root_password: "$($Secrets.MINIO_ROOT_PASSWORD)"
  minio_access_key: "$($Secrets.MINIO_ACCESS_KEY)"
  minio_secret_key: "$($Secrets.MINIO_SECRET_KEY)"

admin_tools:
  grafana_admin_user: "admin"
  grafana_admin_password: "$($Secrets.GRAFANA_ADMIN_PASSWORD)"
  pgadmin_default_email: "admin@citadelbuy.com"
  pgadmin_default_password: "$($Secrets.PGADMIN_DEFAULT_PASSWORD)"

internal:
  internal_api_key: "$($Secrets.INTERNAL_API_KEY)"
  webhook_secret: "$($Secrets.WEBHOOK_SECRET)"

search:
  elasticsearch_password: "$($Secrets.ELASTICSEARCH_PASSWORD)"
"@

    Set-Content -Path $OutputFile -Value $content -Encoding UTF8
    Write-Success "Secrets written to: $OutputFile (YAML format)"
}

################################################################################
# Main Generation Logic
################################################################################

function New-AllSecrets {
    Write-Section "Generating Cryptographically Secure Secrets"

    $secrets = @{}

    # JWT Authentication
    Write-Info "Generating JWT secrets (64+ characters)..."
    $secrets.JWT_SECRET = New-JwtSecret
    $secrets.JWT_REFRESH_SECRET = New-JwtSecret

    # Ensure JWT secrets are different
    while ($secrets.JWT_SECRET -eq $secrets.JWT_REFRESH_SECRET) {
        $secrets.JWT_REFRESH_SECRET = New-JwtSecret
    }

    Write-Success "JWT secrets generated"

    # Encryption Keys
    Write-Info "Generating encryption keys (64 hex characters)..."
    $secrets.ENCRYPTION_KEY = New-EncryptionKey
    $secrets.KYC_ENCRYPTION_KEY = New-EncryptionKey
    Write-Success "Encryption keys generated"

    # Database
    Write-Info "Generating database password..."
    $secrets.POSTGRES_PASSWORD = New-StrongPassword
    Write-Success "Database password generated"

    # Redis
    Write-Info "Generating Redis password..."
    $secrets.REDIS_PASSWORD = New-StrongPassword
    Write-Success "Redis password generated"

    # Session
    Write-Info "Generating session secret..."
    $secrets.SESSION_SECRET = New-JwtSecret
    Write-Success "Session secret generated"

    # Message Queue
    Write-Info "Generating RabbitMQ password..."
    $secrets.RABBITMQ_PASSWORD = New-StrongPassword
    Write-Success "RabbitMQ password generated"

    # Storage
    Write-Info "Generating storage credentials..."
    $secrets.MINIO_ROOT_PASSWORD = New-StrongPassword
    $secrets.MINIO_ACCESS_KEY = New-Password
    $secrets.MINIO_SECRET_KEY = New-StrongPassword
    Write-Success "Storage credentials generated"

    # Admin Tools
    Write-Info "Generating admin tool passwords..."
    $secrets.GRAFANA_ADMIN_PASSWORD = New-StrongPassword
    $secrets.PGADMIN_DEFAULT_PASSWORD = New-StrongPassword
    Write-Success "Admin tool passwords generated"

    # Internal APIs
    Write-Info "Generating internal API keys..."
    $secrets.INTERNAL_API_KEY = New-ApiKey -Prefix "cby_int"
    $secrets.WEBHOOK_SECRET = New-JwtSecret
    Write-Success "Internal API keys generated"

    # Search
    Write-Info "Generating Elasticsearch password..."
    $secrets.ELASTICSEARCH_PASSWORD = New-StrongPassword
    Write-Success "Elasticsearch password generated"

    Write-Success "All secrets generated successfully!"

    return $secrets
}

################################################################################
# Main Script
################################################################################

function Main {
    Write-Header

    # Show help if requested
    if ($Help) {
        Show-Help
        exit 0
    }

    # Validation mode
    if ($Validate) {
        $result = Test-SecretsFile -FilePath $OutputFile
        if ($result) {
            exit 0
        }
        else {
            exit 1
        }
    }

    # Check if output file exists
    if (Test-Path $OutputFile) {
        Write-Warning "Output file already exists: $OutputFile"
        $response = Read-Host "Overwrite? (yes/no)"
        if ($response -notmatch "^[Yy]([Ee][Ss])?$") {
            Write-Info "Operation cancelled"
            exit 0
        }
    }

    # Generate secrets
    $secrets = New-AllSecrets

    # Output in requested format
    Write-Section "Writing Secrets to File"

    switch ($Format) {
        "env" {
            Write-EnvFormat -OutputFile $OutputFile -Secrets $secrets
        }
        "json" {
            Write-JsonFormat -OutputFile $OutputFile -Secrets $secrets
        }
        "yaml" {
            Write-YamlFormat -OutputFile $OutputFile -Secrets $secrets
        }
        default {
            Write-ErrorMsg "Unknown format: $Format"
            Write-Info "Supported formats: env, json, yaml"
            exit 1
        }
    }

    # Set secure permissions (Windows ACL)
    try {
        $acl = Get-Acl $OutputFile
        $acl.SetAccessRuleProtection($true, $false)

        # Remove all existing rules
        $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }

        # Add only current user with full control
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $currentUser,
            "FullControl",
            "Allow"
        )
        $acl.AddAccessRule($rule)

        Set-Acl $OutputFile $acl
        Write-Success "File permissions set (current user only)"
    }
    catch {
        Write-Warning "Could not set file permissions: $_"
    }

    # Final instructions
    Write-Section "Next Steps"
    Write-Host "Success! Your secrets have been generated securely." -ForegroundColor Green
    Write-Host ""
    Write-Host "Important next steps:"
    Write-Host "  1. Review the generated file: $OutputFile"
    Write-Host "  2. Copy secrets to your actual .env file or secrets manager"
    Write-Host "  3. Validate secrets: .\generate-secrets.ps1 -Validate -OutputFile $OutputFile"
    Write-Host "  4. Secure the file or delete after copying"
    Write-Host "  5. NEVER commit this file to version control"
    Write-Host ""
    Write-Warning "Add to .gitignore: Add-Content .gitignore '$OutputFile'"
    Write-Host ""
}

# Run main function
Main
