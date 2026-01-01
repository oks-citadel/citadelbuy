# CRITICAL: .env File Removal from Git History

## Security Alert: Immediate Action Required

This guide provides step-by-step instructions for removing sensitive .env files from your git repository history. If you have committed a .env file containing secrets, you MUST follow these steps immediately.

## Table of Contents

1. [Immediate Actions](#immediate-actions)
2. [Assessment](#assessment)
3. [Removal Methods](#removal-methods)
4. [Team Communication](#team-communication)
5. [Verification](#verification)
6. [Prevention](#prevention)

---

## 1. Immediate Actions

### Before You Begin

**CRITICAL: Complete these steps IMMEDIATELY before cleaning git history:**

1. **Rotate ALL credentials** that were in the committed .env file
   - See [CREDENTIAL_ROTATION_CHECKLIST.md](./CREDENTIAL_ROTATION_CHECKLIST.md) for detailed steps

2. **Notify your team** that a security incident has occurred
   - Use the [Team Notification Template](#team-notification-template) below

3. **Create a backup** of your repository before any destructive operations:
   ```bash
   git clone --mirror C:/Users/citad/OneDrive/Documents/broxiva-master/organization C:/Users/citad/OneDrive/Documents/broxiva-master-backup
   ```

4. **Revoke any compromised API keys immediately**:
   - Stripe keys
   - AWS access keys
   - SendGrid API keys
   - OpenAI API keys
   - All OAuth client secrets
   - Database passwords

---

## 2. Assessment

### Check What Was Committed

```bash
# Navigate to repository
cd C:/Users/citad/OneDrive/Documents/broxiva-master/organization

# Find all commits that touched .env files
git log --all --full-history --pretty=format:"%H|%ai|%an|%s" -- ".env" "**/.env" ".env.*" "**/.env.*"

# See the actual content in a specific commit
git show COMMIT_HASH:.env
git show COMMIT_HASH:apps/api/.env

# Check if .env files exist in current working directory
find . -name ".env" -type f

# Check if .env is properly ignored now
git check-ignore -v .env
```

### Determine Exposure Level

Document answers to these questions:

- [ ] Which .env file(s) were committed? (Root, API, Web, etc.)
- [ ] How many commits contain the .env file?
- [ ] When was it first committed? (Check oldest commit)
- [ ] Was this pushed to a remote repository? (GitHub, GitLab, etc.)
- [ ] How many team members have access to the repository?
- [ ] Are there any forks of the repository?
- [ ] Is the repository public or private?

**If the repository is PUBLIC, treat this as a CRITICAL security breach!**

---

## 3. Removal Methods

### Method A: BFG Repo-Cleaner (RECOMMENDED - Fast and Safe)

BFG Repo-Cleaner is faster and simpler than git-filter-branch for removing files.

#### Step 1: Install BFG Repo-Cleaner

**Windows (using Chocolatey):**
```bash
choco install bfg-repo-cleaner
```

**Windows (manual installation):**
1. Download BFG from: https://rtyley.github.io/bfg-repo-cleaner/
2. Requires Java Runtime Environment (JRE)
3. Save as `bfg.jar` in a known location

**macOS:**
```bash
brew install bfg
```

**Linux:**
```bash
# Download the JAR file
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
alias bfg='java -jar bfg-1.14.0.jar'
```

#### Step 2: Create a Fresh Clone

```bash
# Clone a fresh mirror copy (this is required for BFG)
cd C:/Users/citad/OneDrive/Documents
git clone --mirror C:/Users/citad/OneDrive/Documents/broxiva-master/organization broxiva-cleanup.git
cd broxiva-cleanup.git
```

#### Step 3: Remove .env Files with BFG

```bash
# Remove all .env files from history
# If installed via Chocolatey or Homebrew:
bfg --delete-files .env

# If using the JAR directly:
java -jar /path/to/bfg.jar --delete-files .env

# Remove multiple patterns at once
bfg --delete-files "{.env,.env.local,.env.production,.env.staging}"

# Or remove from specific paths only
bfg --delete-files .env --no-blob-protection
```

#### Step 4: Clean Up and Expire Reflog

```bash
# Clean up the repository
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

#### Step 5: Verify Changes

```bash
# Verify .env files are gone
git log --all --full-history -- ".env" "**/.env"
# Should return no results

# Check repository size (should be smaller)
du -sh .
```

#### Step 6: Push Changes to Remote

```bash
# Push the cleaned history (REQUIRES FORCE PUSH)
# WARNING: This will rewrite history for all team members!
git push --force --all
git push --force --tags

# If using the mirror:
cd C:/Users/citad/OneDrive/Documents/broxiva-cleanup.git
git push
```

---

### Method B: Git Filter-Branch (Alternative)

Use this method if BFG is not available or if you need more fine-grained control.

#### Step 1: Create a Backup Branch

```bash
cd C:/Users/citad/OneDrive/Documents/broxiva-master/organization
git checkout -b backup-before-cleanup
git push origin backup-before-cleanup
```

#### Step 2: Run Filter-Branch

```bash
# Remove .env from all branches and history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env apps/api/.env apps/web/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Alternative: More comprehensive removal
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch -r **/.env .env .env.* apps/**/.env' \
  --prune-empty --tag-name-filter cat -- --all
```

#### Step 3: Clean Up References

```bash
# Remove backup references created by filter-branch
rm -rf .git/refs/original/

# Expire reflog
git reflog expire --expire=now --all

# Run garbage collection
git gc --prune=now --aggressive
```

#### Step 4: Verify and Push

```bash
# Verify removal
git log --all --full-history -- ".env"

# Force push to remote (WARNING: Destructive operation!)
git push origin --force --all
git push origin --force --tags
```

---

### Method C: Git Filter-Repo (Most Powerful)

Git filter-repo is the modern, fastest solution recommended by Git.

#### Step 1: Install Git Filter-Repo

```bash
# Python required
pip3 install git-filter-repo

# Or on macOS
brew install git-filter-repo
```

#### Step 2: Create Fresh Clone

```bash
cd C:/Users/citad/OneDrive/Documents
git clone C:/Users/citad/OneDrive/Documents/broxiva-master/organization broxiva-cleanup
cd broxiva-cleanup
```

#### Step 3: Remove Files

```bash
# Remove .env files
git filter-repo --invert-paths --path .env --path-glob '*/.env' --force

# More comprehensive removal
git filter-repo --invert-paths \
  --path .env \
  --path .env.local \
  --path .env.production \
  --path .env.staging \
  --path-glob 'apps/*/.env' \
  --path-glob '**/.env.*' \
  --force
```

#### Step 4: Re-add Remote and Push

```bash
# git-filter-repo removes remotes for safety
git remote add origin <your-remote-url>

# Force push
git push origin --force --all
git push origin --force --tags
```

---

## 4. Team Communication

### Team Notification Template

Send this message to ALL team members immediately:

```
SUBJECT: CRITICAL SECURITY ALERT - Git History Rewrite Required

Priority: CRITICAL
Action Required: IMMEDIATE

Team,

A security incident has been identified: sensitive .env files containing credentials
were committed to our git repository.

IMMEDIATE ACTIONS REQUIRED:

1. STOP all git operations immediately (do not push or pull)

2. ALL credentials have been rotated. You will receive new credentials via
   [secure channel - e.g., 1Password, AWS Secrets Manager]

3. Git history will be rewritten to remove the sensitive files

4. Timeline:
   - [DATE/TIME]: Git history cleanup begins
   - [DATE/TIME]: History rewrite complete, new credentials distributed
   - [DATE/TIME]: Team resumes normal git operations

AFTER HISTORY REWRITE, ALL TEAM MEMBERS MUST:

1. Backup any uncommitted local changes:
   ```
   git stash
   git branch backup-my-work
   ```

2. Delete your local repository and re-clone:
   ```
   cd [parent-directory]
   rm -rf broxiva-master
   git clone [repository-url]
   ```

3. If you have uncommitted work:
   ```
   git cherry-pick [commits-from-backup-branch]
   # Or manually copy changes from backup-my-work branch
   ```

4. Update your .env file with NEW credentials (do not reuse old .env files!)

5. Verify .env is ignored:
   ```
   git status  # Should NOT show .env
   git check-ignore -v .env  # Should show it's ignored
   ```

DO NOT:
- Do not force push your branches
- Do not merge old branches until they are rebased
- Do not use any old credentials
- Do not commit .env files

Questions? Contact: [Security Lead Contact]

Incident ID: ENV-LEAK-[DATE]
```

---

## 5. Verification

### Verify .env Files Are Removed

```bash
# Check all branches
git log --all --full-history --oneline -- ".env" "**/.env"
# Should return nothing

# Check for any remaining .env patterns
git log --all --full-history --oneline -- ".env*" "**/.env*"

# Search for the word "password" in history (to find any remaining secrets)
git log -S "DATABASE_URL" --all --full-history
git log -S "JWT_SECRET" --all --full-history
git log -S "STRIPE_SECRET" --all --full-history

# Verify current .env is ignored
git status  # Should not show .env
git check-ignore -v .env  # Should show .env is ignored by .gitignore
```

### Verify Repository Size Reduction

```bash
# Check repository size before and after
git count-objects -vH

# Compare with backup
cd C:/Users/citad/OneDrive/Documents/broxiva-master-backup
git count-objects -vH
```

### Test Team Member Workflow

Have one team member test the re-clone process:

```bash
# 1. Clone fresh repository
git clone [repository-url] test-clone
cd test-clone

# 2. Verify no .env in history
git log --all --full-history -- .env

# 3. Create new .env from template
cp .env.example .env
# Add new credentials

# 4. Verify .env is ignored
git status  # Should not show .env

# 5. Test normal workflow
git checkout -b test-branch
# Make changes to code (NOT .env)
git add .
git commit -m "Test commit"
git push origin test-branch
```

---

## 6. Prevention

### Implement Git Hooks

Create `.git/hooks/pre-commit` to prevent .env commits:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Prevent committing .env files
if git diff --cached --name-only | grep -qE '\.env$|\.env\.|secrets\.json|credentials\.json'; then
    echo "ERROR: Attempting to commit sensitive files!"
    echo "Blocked files:"
    git diff --cached --name-only | grep -E '\.env$|\.env\.|secrets\.json|credentials\.json'
    echo ""
    echo "These files must NEVER be committed."
    echo "Add them to .gitignore and commit the .gitignore instead."
    exit 1
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Use Shared Git Hooks (Recommended)

For the entire team to use the same hooks, use a shared hooks directory:

1. Create `scripts/git-hooks/pre-commit`:
```bash
#!/bin/bash
# scripts/git-hooks/pre-commit

# Prevent committing .env files
if git diff --cached --name-only | grep -qE '\.env$|\.env\.|secrets\.json|credentials\.json'; then
    echo "==============================================="
    echo "  SECURITY: BLOCKED COMMIT"
    echo "==============================================="
    echo "You are attempting to commit sensitive files:"
    echo ""
    git diff --cached --name-only | grep -E '\.env$|\.env\.|secrets\.json|credentials\.json' | sed 's/^/  - /'
    echo ""
    echo "These files must NEVER be committed to version control."
    echo "They likely contain passwords, API keys, and other secrets."
    echo ""
    echo "Actions:"
    echo "  1. Remove these files from staging: git reset HEAD <file>"
    echo "  2. Ensure they are in .gitignore"
    echo "  3. Commit other files only"
    echo "==============================================="
    exit 1
fi

exit 0
```

2. Configure git to use shared hooks:
```bash
git config core.hooksPath scripts/git-hooks
chmod +x scripts/git-hooks/pre-commit
```

3. Add to README.md or onboarding documentation:
```markdown
## First-Time Setup

After cloning, configure git hooks:

```bash
git config core.hooksPath scripts/git-hooks
```
```

### Implement CI/CD Checks

Add to your `.github/workflows/security-check.yml`:

```yaml
name: Security Check

on: [push, pull_request]

jobs:
  check-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history

      - name: Check for .env files in history
        run: |
          if git log --all --full-history --name-only -- ".env" "**/.env" | grep -q ".env"; then
            echo "ERROR: .env files found in git history!"
            exit 1
          fi

      - name: Check for secrets in current commit
        run: |
          if git diff --name-only HEAD~1 | grep -qE '\.env$|\.env\.|secrets\.json'; then
            echo "ERROR: Attempting to commit sensitive files!"
            exit 1
          fi
```

### Use Git Secret Scanning Tools

#### TruffleHog (Recommended)

```bash
# Install
pip install truffleHog

# Scan repository
trufflehog git file://. --only-verified

# Scan specific branch
trufflehog git file://. --branch main
```

#### GitLeaks

```bash
# Install
brew install gitleaks  # macOS
choco install gitleaks  # Windows

# Scan repository
gitleaks detect --source . --verbose

# Scan commits
gitleaks detect --source . --log-opts="--all"
```

#### Git-secrets (AWS)

```bash
# Install
brew install git-secrets  # macOS

# Initialize in repository
git secrets --install
git secrets --register-aws

# Scan repository
git secrets --scan-history
```

### Environment Variable Management Best Practices

1. **Use Environment Variable Management Tools:**
   - Development: `dotenv-cli`, `direnv`
   - Production: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault

2. **Implement a .env.example Template:**
   ```bash
   # Always maintain .env.example with no real secrets
   cp .env.example .env
   # Edit .env with real credentials
   ```

3. **Use Secret Management Services:**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Cloud Secret Manager
   - HashiCorp Vault
   - 1Password Secrets Automation
   - Doppler

4. **Encrypt Secrets in CI/CD:**
   - GitHub Secrets
   - GitLab CI/CD Variables
   - Azure Pipelines Variables
   - CircleCI Contexts

---

## Additional Resources

- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git Filter-Repo](https://github.com/newren/git-filter-repo)
- [OWASP: Secrets Management](https://owasp.org/www-community/vulnerabilities/Secrets_Management)

---

## Emergency Contacts

- Security Lead: [Name/Contact]
- DevOps Lead: [Name/Contact]
- Incident Response: [Email/Slack Channel]

---

**Document Version:** 1.0
**Last Updated:** 2025-12-04
**Next Review:** After incident resolution
