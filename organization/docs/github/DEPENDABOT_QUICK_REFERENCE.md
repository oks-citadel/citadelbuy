# Dependabot Quick Reference

## Update Schedule at a Glance

```
Monday 09:00 UTC    → NPM (root, api, web, mobile)
Tuesday 09:00 UTC   → Docker (all services)
Wednesday 09:00 UTC → GitHub Actions, N8N, Load Tests
1st Monday/Month    → Terraform (all modules)
Immediate           → Security Updates (always)
```

## Key Configuration Details

### Total Monitored Locations
- **7** NPM package.json locations
- **11** Docker/Dockerfile locations
- **1** GitHub Actions workflow directory
- **8** Terraform module directories

### Pull Request Limits
- NPM: **10 PRs** per location
- Docker: **5 PRs** per location
- GitHub Actions: **5 PRs**
- Terraform: **5 PRs** per module

## Common Commands

### Check Dependabot Status
```bash
# View Dependabot PRs
gh pr list --label dependencies

# View security alerts
gh api /repos/{owner}/{repo}/dependabot/alerts
```

### Enable Auto-Merge for Dependabot PR
```bash
# Auto-merge a specific PR
gh pr merge <PR-NUMBER> --auto --squash

# Enable auto-merge with rebase
gh pr merge <PR-NUMBER> --auto --rebase
```

### Manually Trigger Dependabot
```bash
# Trigger via API (requires GitHub token)
gh api repos/{owner}/{repo}/dependabot/secrets/PUBLIC_KEY
```

## Labels Used
- `dependencies` - All updates
- `npm` - NPM updates
- `docker` - Docker updates
- `github-actions` - Workflow updates
- `terraform` - Infrastructure updates
- `api`, `web`, `mobile` - Component labels
- `automerge` - Safe for auto-merge

## Team Assignments
- `platform-team` → Root workspace, Terraform
- `backend-team` → API dependencies
- `frontend-team` → Web dependencies
- `mobile-team` → Mobile dependencies
- `devops-team` → Docker, CI/CD, Infrastructure
- `security-team` → Security modules

## Dependency Groups

### API (NestJS)
- `nestjs-dependencies` → @nestjs/*
- `prisma-dependencies` → prisma, @prisma/*
- `security-dependencies` → helmet, bcrypt, passport
- `testing-dependencies` → jest, supertest

### Web (Next.js)
- `nextjs-dependencies` → next, react, react-dom
- `ui-dependencies` → @radix-ui/*, tailwindcss
- `state-management` → zustand, @tanstack/*
- `testing-dependencies` → playwright, jest

### Mobile (React Native)
- `react-native-dependencies` → react-native, @react-native/*
- `navigation-dependencies` → @react-navigation/*
- `testing-dependencies` → jest, detox

## Commit Message Prefixes
```
chore(deps):      Root workspace
chore(api):       API updates
chore(web):       Web updates
chore(mobile):    Mobile updates
chore(docker):    Docker updates
chore(ci):        GitHub Actions
chore(terraform): Terraform updates
```

## Quick Actions

### Approve and Merge a Dependabot PR
```bash
gh pr review <PR-NUMBER> --approve
gh pr merge <PR-NUMBER> --squash
```

### Close a Dependabot PR (Won't be recreated)
```bash
gh pr close <PR-NUMBER>
# Add comment explaining why
gh pr comment <PR-NUMBER> -b "Ignoring this update because..."
```

### Reopen a Closed Dependabot PR
```bash
# Comment on the PR with:
@dependabot reopen
```

### Ignore a Specific Dependency
```bash
# Comment on the PR with:
@dependabot ignore this dependency
```

### Ignore a Major Version
```bash
# Comment on the PR with:
@dependabot ignore this major version
```

## Versioning Strategy
**Strategy:** `increase`
- Always increases version even if lockfile compatible
- Ensures latest versions are used
- More aggressive update policy

## Security Updates
- **Priority:** Immediate
- **Schedule:** Independent of weekly schedule
- **Auto-created:** Yes
- **Labels:** `dependencies`, `security`

## Troubleshooting One-Liners

### Why is Dependabot not creating PRs?
```bash
# Check if enabled
gh api repos/{owner}/{repo}/vulnerability-alerts

# Validate config
npx dependabot-yaml-validator .github/dependabot.yml
```

### Too many PRs?
```bash
# Find all open Dependabot PRs
gh pr list --label dependencies --state open --json number,title

# Close all pending minor updates (example)
gh pr list --label dependencies --json number --jq '.[].number' | \
  xargs -I {} gh pr close {}
```

### Check last Dependabot run
```bash
# View repository insights
# Navigate to: Insights → Dependency graph → Dependabot
```

## Configuration File Location
```
.github/dependabot.yml
```

## Documentation
- Full setup guide: `.github/DEPENDABOT_SETUP.md`
- Official docs: https://docs.github.com/en/code-security/dependabot
