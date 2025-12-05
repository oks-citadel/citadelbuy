# Git History Cleanup Guide - Removing Committed Secrets

**Last Updated:** December 3, 2025
**Purpose:** Remove secrets that were accidentally committed to git history
**Risk Level:** HIGH - This rewrites git history and requires team coordination

---

## WARNING

**⚠️ CRITICAL WARNINGS:**

1. **Rewriting history is DANGEROUS** - it changes commit SHAs and breaks everyone's local copies
2. **Simply deleting a commit does NOT remove secrets** - they remain in git history
3. **Once pushed to a public repository, secrets are PERMANENTLY EXPOSED** - assume compromise
4. **All team members must re-clone** after history rewrite
5. **This cannot be undone** - make backups first

**IF SECRETS WERE EXPOSED IN A PUBLIC REPOSITORY:**
- **ASSUME COMPLETE COMPROMISE** - secrets are already scraped by bots
- Rotate ALL secrets immediately (see SECURITY_CREDENTIALS.md)
- Do NOT rely solely on removing from git history
- Consider the repository permanently tainted

---

## Table of Contents

1. [Immediate Actions](#immediate-actions)
2. [Prerequisites](#prerequisites)
3. [Method 1: BFG Repo-Cleaner (Recommended)](#method-1-bfg-repo-cleaner-recommended)
4. [Method 2: git-filter-repo](#method-2-git-filter-repo)
5. [Method 3: Manual git-filter-branch](#method-3-manual-git-filter-branch)
6. [Post-Cleanup Steps](#post-cleanup-steps)
7. [Team Communication](#team-communication)
8. [Verification](#verification)

---

## Immediate Actions

**Before cleaning git history, do this FIRST:**

### 1. Revoke All Exposed Secrets

**DO THIS IMMEDIATELY - WITHIN 1 HOUR:**

```bash
# Generate new secrets
./scripts/generate-secrets.sh > new-secrets.txt

# Update production environment
kubectl set env deployment/api \
    JWT_SECRET="$(openssl rand -base64 64)" \
    JWT_REFRESH_SECRET="$(openssl rand -base64 64)" \
    KYC_ENCRYPTION_KEY="$(openssl rand -hex 32)"

# Invalidate all sessions
redis-cli FLUSHDB

# Force password resets
psql -c "UPDATE users SET force_password_reset = true;"
```

### 2. Disable Compromised API Keys

- **Stripe:** https://dashboard.stripe.com/apikeys → Delete old key
- **AWS:** https://console.aws.amazon.com/iam/ → Deactivate access keys
- **SendGrid:** https://app.sendgrid.com/settings/api_keys → Delete
- **PayPal:** https://developer.paypal.com/dashboard → Regenerate
- **GitHub OAuth:** https://github.com/settings/developers → Regenerate secret
- **Google OAuth:** https://console.cloud.google.com/apis/credentials → Delete & recreate

### 3. Document the Incident

Create incident report:
```markdown
# Security Incident Report

**Date:** 2025-12-03
**Incident:** Secrets committed to git repository
**Severity:** HIGH

## What was exposed:
- [ ] .env file with database credentials
- [ ] JWT secrets
- [ ] Encryption keys
- [ ] API keys (list providers)
- [ ] Other (specify)

## When discovered:
- Date: [YYYY-MM-DD]
- Time: [HH:MM UTC]
- Discovered by: [Name]

## How long exposed:
- First commit: [commit SHA]
- Duration: [X days/hours]
- Repository visibility: [public/private]

## Actions taken:
- [ ] All secrets rotated
- [ ] API keys revoked
- [ ] Sessions invalidated
- [ ] Users notified (if required)
- [ ] Git history cleaned

## Root cause:
[Explain how it happened]

## Prevention measures:
- [ ] Pre-commit hooks installed
- [ ] Secrets scanning enabled
- [ ] Team training completed
```

---

## Prerequisites

### Backup Everything

```bash
# Clone a backup copy
git clone --mirror https://github.com/citadelbuy/citadelbuy.git citadelbuy-backup.git
cd citadelbuy-backup.git
tar -czf ../citadelbuy-backup-$(date +%Y%m%d).tar.gz .

# Verify backup
tar -tzf ../citadelbuy-backup-$(date +%Y%m%d).tar.gz | head
```

### Notify Team

**Send to all developers BEFORE starting:**

```
URGENT: Git History Rewrite Scheduled

We will be rewriting git history to remove accidentally committed secrets.

REQUIRED ACTIONS:
1. Commit and push all your work by [DATE TIME]
2. After the rewrite, DELETE your local repo
3. Re-clone the repository
4. Do NOT merge or pull - DELETE and re-clone
5. Update your .env file with new secrets (see #security channel)

Timeline:
- Preparation: [DATE] 9:00 AM UTC
- History rewrite: [DATE] 10:00 AM UTC
- Verification: [DATE] 11:00 AM UTC
- Team re-clones: [DATE] 12:00 PM UTC

Questions? Ask in #security or DM me directly.
```

---

## Method 1: BFG Repo-Cleaner (Recommended)

**Best for:** Removing entire files (.env, credentials.json, etc.)
**Speed:** Very fast (10x-100x faster than git-filter-branch)
**Difficulty:** Easy

### Install BFG

```bash
# macOS
brew install bfg

# Linux
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
alias bfg='java -jar bfg-1.14.0.jar'

# Windows (Git Bash)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
# Place in C:\bfg\ and add to PATH
```

### Clone Mirror Repository

```bash
# Clone fresh mirror (no working directory)
git clone --mirror https://github.com/citadelbuy/citadelbuy.git
cd citadelbuy.git
```

### Remove Files

```bash
# Remove specific files
bfg --delete-files .env
bfg --delete-files .env.local
bfg --delete-files .env.production
bfg --delete-files credentials.json

# Remove by pattern
bfg --delete-files "*.pem"
bfg --delete-files "*.key"
bfg --delete-files "*.cert"

# Remove directories
bfg --delete-folders secrets
bfg --delete-folders credentials
```

### Replace Secrets in Files (If secrets are embedded in code)

```bash
# Create replacement file
cat > passwords.txt << 'EOF'
citadelbuy123===>***REMOVED***
old-jwt-secret-here===>***REMOVED***
sk_live_abc123===>***REMOVED***
EOF

# Replace text
bfg --replace-text passwords.txt
```

### Clean Up and Push

```bash
# Expire reflog and garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify changes
git log --all --oneline | head -20

# Force push (THIS REWRITES HISTORY)
git push --force

# Push to all branches
git push --force --all
git push --force --tags
```

---

## Method 2: git-filter-repo

**Best for:** Complex filtering, renaming, path rewriting
**Speed:** Fast
**Difficulty:** Medium

### Install git-filter-repo

```bash
# macOS
brew install git-filter-repo

# Linux
pip3 install git-filter-repo

# Verify installation
git filter-repo --version
```

### Clone Fresh Repository

```bash
# Clone (NOT mirror this time)
git clone https://github.com/citadelbuy/citadelbuy.git citadelbuy-clean
cd citadelbuy-clean
```

### Remove Files from History

```bash
# Remove specific files
git filter-repo --path .env --invert-paths
git filter-repo --path apps/api/.env --invert-paths
git filter-repo --path apps/web/.env.local --invert-paths

# Remove by pattern
git filter-repo --path-glob '*.pem' --invert-paths
git filter-repo --path-glob '*.key' --invert-paths

# Remove directory
git filter-repo --path secrets/ --invert-paths
```

### Replace Text in Files

```bash
# Create replacement file (Python-style regex)
cat > replacements.txt << 'EOF'
regex:JWT_SECRET=.*===>JWT_SECRET=***REMOVED***
regex:DATABASE_URL=.*===>DATABASE_URL=***REMOVED***
regex:sk_live_\w+===>***STRIPE_KEY_REMOVED***
literal:old-password-here===>***REMOVED***
EOF

# Apply replacements
git filter-repo --replace-text replacements.txt
```

### Push Changes

```bash
# Add remote (filter-repo removes remotes)
git remote add origin https://github.com/citadelbuy/citadelbuy.git

# Force push
git push --force --all
git push --force --tags
```

---

## Method 3: Manual git-filter-branch

**Best for:** Custom filtering logic
**Speed:** VERY SLOW (not recommended for large repos)
**Difficulty:** Hard

**⚠️ WARNING:** git-filter-branch is deprecated. Use BFG or git-filter-repo instead.

### Remove Files

```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env apps/api/.env apps/web/.env.local' \
  --prune-empty --tag-name-filter cat -- --all
```

### Remove Secrets from Files

```bash
git filter-branch --force --tree-filter \
  'if [ -f config.yml ]; then sed -i "s/password: .*/password: REMOVED/g" config.yml; fi' \
  --prune-empty --tag-name-filter cat -- --all
```

### Clean Up

```bash
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all
git push --force --tags
```

---

## Post-Cleanup Steps

### 1. Verify Secrets Are Removed

```bash
# Search for common secret patterns
git log -p --all | grep -i "jwt_secret"
git log -p --all | grep -i "password"
git log -p --all | grep -i "api_key"
git log -p --all | grep -E "sk_live_|sk_test_"

# If anything found, repeat cleanup
```

### 2. Force All Forks to Update

```bash
# If this is the main repository, all forks need updating
# Contact fork owners and request they re-fork
```

### 3. Update Documentation

```bash
# Add to README
echo "" >> README.md
echo "## Security Note" >> README.md
echo "This repository was cleaned on $(date +%Y-%m-%d) to remove accidentally committed secrets." >> README.md
echo "All secrets have been rotated. If you have an old clone, please delete and re-clone." >> README.md
```

### 4. Enable Protection

```bash
# Install pre-commit hook
curl -o .git/hooks/pre-commit https://raw.githubusercontent.com/gitguardian/ggshield/main/scripts/git-hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Add to package.json
npm install --save-dev @commitlint/cli @commitlint/config-conventional
npm install --save-dev husky

# Enable secrets scanning (GitHub)
# Go to: Settings → Security → Secret scanning → Enable
```

---

## Team Communication

### Initial Notification (Before Cleanup)

```
Subject: URGENT: Git History Rewrite Required

Team,

We need to rewrite git history to remove accidentally committed secrets.

WHAT HAPPENED:
[Brief explanation]

WHAT YOU NEED TO DO:
1. Finish all work by [DATE TIME]
2. Push all commits
3. After rewrite notification, DELETE local repo
4. Re-clone from origin
5. Get new .env file from 1Password/LastPass

TIMELINE:
- Now: Push all work
- [DATE TIME]: History rewrite begins
- [DATE TIME]: Notification sent to re-clone
- [DATE TIME]: Work resumes

DO NOT:
- Pull or merge after the rewrite
- Try to rebase your branches
- Keep working on old clone

Questions? #security channel or DM me.
```

### After Cleanup Notification

```
Subject: Git History Rewrite Complete - RE-CLONE REQUIRED

Team,

The git history rewrite is complete. You MUST re-clone the repository.

STEPS TO RE-CLONE:
1. Save any uncommitted work (git stash or backup)
2. DELETE your local citadelbuy directory:
   rm -rf citadelbuy  # Or move to trash
3. Re-clone:
   git clone https://github.com/citadelbuy/citadelbuy.git
4. Get new .env file:
   - Backend: Copy from 1Password → "CitadelBuy API Env"
   - Frontend: Copy from 1Password → "CitadelBuy Web Env"
5. Verify secrets are new (don't use old .env)

VERIFICATION:
# Should show new commit SHAs
git log --oneline | head -5

# Should NOT find secrets
git log -p | grep -i "citadelbuy123"

Common Issues:
Q: Can I just pull?
A: NO! You must delete and re-clone.

Q: What about my feature branch?
A: Re-create it from main after re-cloning.

Q: My commits are gone!
A: Check #engineering - we may need to cherry-pick.

Status: https://status.citadelbuy.internal/incident/123
```

---

## Verification

### Automated Verification Script

Create `verify-secrets-removed.sh`:

```bash
#!/bin/bash

echo "=========================================="
echo "Verifying Secrets Removal"
echo "=========================================="

FOUND_SECRETS=0

# Check for common secret patterns
echo ""
echo "Checking for JWT secrets..."
if git log --all -p | grep -q "JWT_SECRET="; then
    echo "❌ FOUND: JWT_SECRET in history"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
else
    echo "✓ Clean: No JWT_SECRET found"
fi

echo ""
echo "Checking for database passwords..."
if git log --all -p | grep -q "password.*citadelbuy123"; then
    echo "❌ FOUND: Weak password in history"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
else
    echo "✓ Clean: No weak passwords found"
fi

echo ""
echo "Checking for Stripe keys..."
if git log --all -p | grep -qE "sk_(live|test)_[A-Za-z0-9]+"; then
    echo "❌ FOUND: Stripe keys in history"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
else
    echo "✓ Clean: No Stripe keys found"
fi

echo ""
echo "Checking for AWS keys..."
if git log --all -p | grep -qE "AKIA[A-Z0-9]{16}"; then
    echo "❌ FOUND: AWS keys in history"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
else
    echo "✓ Clean: No AWS keys found"
fi

echo ""
echo "Checking for .env files..."
if git log --all --name-only | grep -q "\.env$"; then
    echo "❌ FOUND: .env files in history"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
else
    echo "✓ Clean: No .env files found"
fi

echo ""
echo "=========================================="
if [ $FOUND_SECRETS -eq 0 ]; then
    echo "✓ SUCCESS: No secrets found in git history"
    echo "=========================================="
    exit 0
else
    echo "❌ FAILED: Found $FOUND_SECRETS types of secrets"
    echo "Run cleanup again!"
    echo "=========================================="
    exit 1
fi
```

Run verification:
```bash
chmod +x verify-secrets-removed.sh
./verify-secrets-removed.sh
```

### Manual Verification

```bash
# 1. Check recent commits
git log --oneline -20

# 2. Search entire history
git log --all -p | grep -i "password" | head -20
git log --all -p | grep -i "secret" | head -20
git log --all -p | grep -i "api_key" | head -20

# 3. Check .env files
git log --all --name-only | grep "\.env"

# 4. Check file size (should be smaller)
du -sh .git

# 5. Verify commit count
git rev-list --all --count
```

---

## Troubleshooting

### Issue: "refusing to merge unrelated histories"

```bash
# Team members seeing this after re-clone
# Solution: They need to DELETE (not pull) their local repo and re-clone

rm -rf citadelbuy
git clone https://github.com/citadelbuy/citadelbuy.git
```

### Issue: Protected branch preventing force push

```bash
# Temporarily disable branch protection
# GitHub: Settings → Branches → Edit rule → Uncheck "Include administrators"
# Push changes
git push --force
# Re-enable branch protection
```

### Issue: Large .git directory after cleanup

```bash
# Aggressive garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Nuclear option: re-pack everything
git repack -A -d --depth=250 --window=250
```

### Issue: Secrets still appearing in git log

```bash
# Make sure to clean ALL branches and tags
git filter-repo --path .env --invert-paths --force

# Then force push everything
git push --force --all
git push --force --tags
```

---

## Prevention

### 1. Install Pre-commit Hook

```bash
# Install git-secrets
brew install git-secrets  # macOS
apt-get install git-secrets  # Linux

# Initialize in repo
cd /path/to/citadelbuy
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'JWT_SECRET=.*'
git secrets --add 'DATABASE_URL=.*'
git secrets --add 'API_KEY=.*'
git secrets --add 'sk_live_[A-Za-z0-9]+'
```

### 2. Enable GitGuardian

```yaml
# .github/workflows/secrets-scan.yml
name: Secret Scanning

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: GitGuardian scan
        uses: GitGuardian/ggshield-action@v1
        env:
          GITHUB_PUSH_BEFORE_SHA: ${{ github.event.before }}
          GITHUB_PUSH_BASE_SHA: ${{ github.event.base }}
          GITHUB_DEFAULT_BRANCH: ${{ github.event.repository.default_branch }}
          GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
```

### 3. Add to .gitignore

```bash
# Verify comprehensive .gitignore
cat >> .gitignore << 'EOF'
# Environment variables
.env
.env.*
!.env.example
!.env.*.example

# Credentials
credentials.json
secrets.json
*.pem
*.key
*.cert

# Never commit these
**/aws-credentials.json
**/gcp-credentials.json
**/firebase-credentials.json
EOF
```

### 4. Team Training

Schedule quarterly security training covering:
- What are secrets and why they matter
- How to use .env files correctly
- How to verify files before committing
- What to do if secrets are committed
- Using password managers for team secrets

---

## Additional Resources

- [BFG Repo-Cleaner Documentation](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [GitGuardian: Secrets detection](https://www.gitguardian.com/)

---

## Summary Checklist

**Before cleanup:**
- [ ] Rotate all exposed secrets
- [ ] Revoke compromised API keys
- [ ] Create full backup of repository
- [ ] Notify all team members
- [ ] Schedule maintenance window

**During cleanup:**
- [ ] Use BFG or git-filter-repo (not filter-branch)
- [ ] Remove files from history
- [ ] Replace hardcoded secrets in code
- [ ] Garbage collect repository
- [ ] Force push to remote

**After cleanup:**
- [ ] Verify secrets are removed
- [ ] Test application with new secrets
- [ ] Ensure team re-clones repository
- [ ] Enable secrets scanning
- [ ] Document incident
- [ ] Update security procedures

---

**Remember:** Prevention is better than cleanup. Always verify files before committing!

**For questions:** Contact security@citadelbuy.com or #security Slack channel

---

**Document Version:** 1.0
**Last Updated:** December 3, 2025
**Next Review:** June 3, 2026
