# Dependabot Configuration Summary

## Overview
Dependabot has been configured for the CitadelBuy repository to automate dependency updates across all components of the platform.

## Configuration File
**Location:** `.github/dependabot.yml`

## What's Monitored

### 1. NPM Dependencies (Weekly - Mondays at 09:00 UTC)
- **Root workspace** (`/`)
- **API application** (`/apps/api`)
- **Web application** (`/apps/web`)
- **Mobile application** (`/apps/mobile`)
- **N8N Workflows** (`/n8n-workflows`) - Wednesdays
- **Load Testing** (`/tests/load`) - Wednesdays

### 2. Docker Dependencies (Weekly - Tuesdays at 09:00 UTC)
- **API Dockerfile** (`/apps/api`)
- **Web Dockerfile** (`/apps/web`)
- **AI Engine Service** (`/apps/services/ai-engine`)
- **Analytics Service** (`/apps/services/analytics`)
- **Chatbot Service** (`/apps/services/chatbot`)
- **Fraud Detection Service** (`/apps/services/fraud-detection`)
- **Pricing Service** (`/apps/services/pricing`)
- **Recommendation Service** (`/apps/services/recommendation`)
- **Search Service** (`/apps/services/search`)
- **Supplier Integration Service** (`/apps/services/supplier-integration`)
- **Infrastructure Docker files** (`/infrastructure/docker`)
- **Root docker-compose.yml** (`/`)

### 3. GitHub Actions (Weekly - Wednesdays at 09:00 UTC)
- All workflow files in `.github/workflows/`

### 4. Terraform Providers (Monthly - First Monday at 09:00 UTC)
- **Main environment** (`/infrastructure/terraform/environments`)
- **Production environment** (`/infrastructure/terraform/environments/prod`)
- **Monitoring module** (`/infrastructure/terraform/modules/monitoring`)
- **Networking module** (`/infrastructure/terraform/modules/networking`)
- **Security module** (`/infrastructure/terraform/modules/security`)
- **Organization module** (`/infrastructure/terraform/modules/organization`)
- **AWS infrastructure** (`/infrastructure/aws`)
- **Azure infrastructure** (`/infrastructure/azure`)

## Key Features

### Dependency Grouping
Dependencies are intelligently grouped to reduce PR noise:

**API Application:**
- NestJS dependencies
- Prisma dependencies
- Security dependencies (helmet, bcrypt, passport, etc.)
- Testing dependencies (Jest, Supertest)
- Production dependencies

**Web Application:**
- Next.js dependencies (Next.js, React, React DOM)
- UI dependencies (Radix UI, Tailwind CSS, etc.)
- State management (Zustand, TanStack Query)
- Testing dependencies (Playwright, Jest, Testing Library)
- Production dependencies

**Mobile Application:**
- React Native dependencies
- Navigation dependencies
- Testing dependencies

### Security Updates
- **Automatic Priority:** Security updates are opened immediately, regardless of the schedule
- Dependabot automatically detects security vulnerabilities and creates PRs with high priority

### Labels
Each PR is automatically labeled with:
- `dependencies` - All dependency updates
- Package ecosystem (`npm`, `docker`, `github-actions`, `terraform`)
- Component/area (`api`, `web`, `mobile`, `infrastructure`, etc.)
- Special labels (`automerge` for root workspace)

### Reviewers
PRs are automatically assigned to relevant teams:
- `citadelbuy/platform-team` - Root workspace, Terraform
- `citadelbuy/backend-team` - API dependencies
- `citadelbuy/frontend-team` - Web dependencies
- `citadelbuy/mobile-team` - Mobile dependencies
- `citadelbuy/devops-team` - Docker, GitHub Actions, Infrastructure
- `citadelbuy/security-team` - Security-related Terraform modules

### Commit Message Format
All commits follow conventional commit format:
- `chore(deps):` - Root workspace updates
- `chore(api):` - API updates
- `chore(web):` - Web updates
- `chore(mobile):` - Mobile updates
- `chore(docker):` - Docker updates
- `chore(ci):` - GitHub Actions updates
- `chore(terraform):` - Terraform updates

### Pull Request Limits
- **NPM dependencies:** 10 open PRs maximum per directory
- **Docker dependencies:** 5 open PRs maximum per directory
- **GitHub Actions:** 5 open PRs maximum
- **Terraform:** 5 open PRs maximum per directory

## Update Schedule

| Day | Time (UTC) | What's Updated |
|-----|-----------|---------------|
| Monday | 09:00 | NPM dependencies (root, API, web, mobile) |
| Tuesday | 09:00 | Docker images and compose files |
| Wednesday | 09:00 | GitHub Actions, N8N, Load tests |
| First Monday | 09:00 | Terraform providers (monthly) |

## How It Works

1. **Scheduled Checks:** Dependabot checks for updates based on the configured schedule
2. **Security Alerts:** Security vulnerabilities are checked continuously and PRs opened immediately
3. **PR Creation:** Dependabot creates PRs with:
   - Clear description of the update
   - Changelog information
   - Release notes
   - Compatibility score
4. **Review & Merge:** Team members review and approve PRs
5. **Automatic Updates:** Once merged, dependencies are updated

## Next Steps

### 1. Configure GitHub Teams
Create the following teams in your GitHub organization:
- `citadelbuy/platform-team`
- `citadelbuy/backend-team`
- `citadelbuy/frontend-team`
- `citadelbuy/mobile-team`
- `citadelbuy/devops-team`
- `citadelbuy/security-team`

Or update the reviewers in `dependabot.yml` to match your existing team structure.

### 2. Enable Dependabot
1. Push this configuration to your repository
2. Go to GitHub repository Settings
3. Navigate to "Security & analysis"
4. Enable "Dependabot alerts"
5. Enable "Dependabot security updates"
6. Enable "Dependabot version updates"

### 3. Configure Branch Protection (Recommended)
For branches where Dependabot PRs will be merged:
1. Require PR reviews before merging
2. Require status checks to pass
3. Enable auto-merge for low-risk updates (optional)

### 4. Set Up Auto-Merge (Optional)
For non-critical dependencies, you can configure auto-merge:
```bash
# Enable auto-merge for a Dependabot PR
gh pr merge <PR-NUMBER> --auto --squash
```

Or use GitHub Actions to auto-merge PRs that pass all tests.

### 5. Monitor Dependabot
- Check the "Insights" > "Dependency graph" > "Dependabot" tab
- Review security advisories regularly
- Monitor PR creation and merge rates
- Adjust schedules and limits as needed

## Customization Options

### Ignore Specific Dependencies
To ignore specific packages, add to a package configuration:
```yaml
ignore:
  - dependency-name: "package-name"
    versions: ["1.x", "2.x"]  # Ignore specific version ranges
```

### Allow Only Security Updates
To only receive security updates for a specific package:
```yaml
ignore:
  - dependency-name: "package-name"
    update-types: ["version-update:semver-major", "version-update:semver-minor"]
```

### Custom Registries
For private npm registries, uncomment and configure the registries section:
```yaml
registries:
  npm-custom:
    type: npm-registry
    url: https://your-registry.com
    token: ${{secrets.NPM_TOKEN}}
```

## Best Practices

1. **Review Security Updates Immediately:** Don't delay merging security patches
2. **Group Related Dependencies:** Keep grouped updates to reduce PR noise
3. **Test Thoroughly:** Ensure CI/CD passes before merging
4. **Keep PRs Small:** If too many updates accumulate, merge incrementally
5. **Monitor Breaking Changes:** Pay attention to major version updates
6. **Update Regularly:** Don't let dependency updates pile up

## Troubleshooting

### Dependabot Not Creating PRs
- Verify Dependabot is enabled in repository settings
- Check if the dependency is already at the latest version
- Verify the directory paths in `dependabot.yml` are correct
- Check for ignore rules that might be blocking updates

### Too Many PRs
- Reduce `open-pull-requests-limit`
- Adjust update schedule to less frequent intervals
- Add more dependency groups to consolidate updates

### Failed PR Checks
- Ensure CI/CD is properly configured
- Check for breaking changes in dependency updates
- Review dependency compatibility with your Node.js version

## Additional Resources

- [Dependabot documentation](https://docs.github.com/en/code-security/dependabot)
- [Configuration options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Keeping dependencies updated](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/keeping-your-actions-up-to-date-with-dependabot)

## Support

For issues with Dependabot configuration, contact:
- Platform Team Lead
- DevOps Team
- Open an issue in the repository
