# Azure DevOps Dependency Scanning

This document describes how to configure dependency scanning in Azure DevOps as an alternative to GitHub Dependabot.

## Overview

Azure DevOps provides several tools for dependency scanning and vulnerability management:

1. **Component Governance** - Built-in dependency tracking
2. **Mend (formerly WhiteSource) Bolt** - Free for open source projects
3. **Snyk Azure DevOps Extension** - Comprehensive vulnerability scanning
4. **Azure DevOps Advanced Security** - GitHub Advanced Security for Azure DevOps

## Option 1: Component Governance (Built-in)

Component Governance is automatically enabled for all Azure DevOps projects.

### Features
- Automatic detection of components
- Vulnerability alerts
- License compliance checking
- Policy enforcement

### Configuration

Add to your pipeline:

```yaml
- task: ComponentGovernanceComponentDetection@0
  displayName: 'Component Detection'
  inputs:
    scanType: 'Register'
    verbosity: 'Verbose'
    alertWarningLevel: 'Medium'
    failOnAlert: true
    failOnSeverity: 'High'
```

### Viewing Results

1. Navigate to your project in Azure DevOps
2. Go to **Pipelines** > **Component Governance**
3. View detected components and vulnerabilities

## Option 2: Mend Bolt (Recommended)

Mend Bolt provides comprehensive vulnerability scanning and is free for Azure DevOps.

### Installation

1. Install from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=whitesource.ws-bolt)
2. Enable for your project
3. Configure in pipeline

### Pipeline Configuration

```yaml
- task: WhiteSource@21
  displayName: 'WhiteSource Bolt Scan'
  inputs:
    cwd: '$(System.DefaultWorkingDirectory)'
```

### Features
- Real-time vulnerability alerts
- Automated dependency updates
- License compliance
- Policy enforcement
- Detailed reports

## Option 3: Snyk Extension

Snyk provides industry-leading vulnerability scanning.

### Installation

1. Install [Snyk Extension](https://marketplace.visualstudio.com/items?itemName=Snyk.snyk-security-scan)
2. Create a Snyk account and get API token
3. Add service connection in Azure DevOps

### Pipeline Configuration

```yaml
- task: SnykSecurityScan@1
  displayName: 'Snyk Security Scan'
  inputs:
    serviceConnectionEndpoint: 'Snyk'
    testType: 'app'
    severityThreshold: 'high'
    monitorWhen: 'always'
    failOnIssues: true
    projectName: '$(Build.Repository.Name)'
    organization: 'your-snyk-org'
```

### Features
- Vulnerability scanning
- License compliance
- Container scanning
- Infrastructure as Code scanning
- Fix PRs (with paid plan)

## Option 4: Azure DevOps Advanced Security

GitHub Advanced Security is now available for Azure DevOps.

### Features
- CodeQL analysis
- Secret scanning
- Dependency scanning
- Security alerts

### Installation

1. Enable Advanced Security for your organization
2. Configure in project settings
3. Pipelines automatically use Advanced Security

### Pipeline Configuration

```yaml
- task: AdvancedSecurity-Dependency-Scanning@1
  displayName: 'Advanced Security Dependency Scan'
  inputs:
    language: 'javascript'
```

## Automated Dependency Updates

### Option 1: Renovate Bot

Renovate is a popular alternative to Dependabot that works with Azure DevOps.

**Installation:**

1. Install [Renovate Azure DevOps App](https://github.com/apps/renovate)
2. Configure with `renovate.json` in repository root

**Example Configuration:**

```json
{
  "extends": ["config:base"],
  "platform": "azure",
  "hostRules": [
    {
      "hostType": "azure",
      "token": "$(AZURE_PERSONAL_ACCESS_TOKEN)"
    }
  ],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true,
      "automergeType": "pr"
    },
    {
      "matchPackagePatterns": ["^@nestjs"],
      "groupName": "NestJS packages"
    }
  ],
  "schedule": ["before 9am on Monday"],
  "timezone": "UTC",
  "labels": ["dependencies"],
  "assignees": ["team-lead"],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "assignees": ["security-team"]
  }
}
```

### Option 2: Azure Pipeline with npm-check-updates

Create a scheduled pipeline to automatically check for updates:

```yaml
schedules:
  - cron: '0 9 * * 1'
    displayName: 'Weekly dependency update check'
    branches:
      include:
        - main
    always: true

trigger: none

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20'

  - script: |
      npm install -g npm-check-updates
      cd apps/api
      ncu -u
      npm install
    displayName: 'Update API dependencies'

  - script: |
      cd apps/web
      ncu -u
      npm install
    displayName: 'Update Web dependencies'

  - script: |
      git config user.name "Azure DevOps"
      git config user.email "azuredevops@citadelbuy.com"
      git checkout -b deps/update-$(Build.BuildId)
      git add .
      git commit -m "chore(deps): update dependencies"
      git push origin deps/update-$(Build.BuildId)
    displayName: 'Create branch and push changes'

  - task: CreatePullRequest@1
    inputs:
      sourceBranch: 'deps/update-$(Build.BuildId)'
      targetBranch: 'develop'
      title: 'chore(deps): Update dependencies - $(Build.BuildId)'
      description: 'Automated dependency updates'
      reviewers: 'team-leads'
```

## Best Practices

### 1. Multiple Layers of Protection

Use multiple tools for comprehensive coverage:
- Component Governance for basic detection
- Snyk or Mend for vulnerability scanning
- Renovate for automated updates

### 2. Configure Vulnerability Policies

Set up policies in Azure DevOps:
```yaml
vulnerabilityPolicies:
  - severity: Critical
    action: Block
  - severity: High
    action: Block
  - severity: Medium
    action: Warn
  - severity: Low
    action: Log
```

### 3. Regular Scans

Schedule regular dependency scans:
```yaml
schedules:
  - cron: '0 2 * * *'
    displayName: 'Daily security scan'
    branches:
      include:
        - main
        - develop
    always: true
```

### 4. Automated Notifications

Configure notifications for vulnerability alerts:
- Email notifications
- Slack/Teams webhooks
- Work item creation

### 5. License Compliance

Monitor open source licenses:
```yaml
- task: ComponentGovernanceComponentDetection@0
  inputs:
    scanType: 'Register'
    ignoreDirectories: 'node_modules'
```

## Comparison Matrix

| Feature | GitHub Dependabot | Component Governance | Mend Bolt | Snyk | Renovate |
|---------|-------------------|---------------------|-----------|------|----------|
| Vulnerability Scanning | ✅ | ✅ | ✅ | ✅ | ✅ |
| Automated Updates | ✅ | ❌ | ✅ | ✅ (paid) | ✅ |
| License Compliance | ✅ | ✅ | ✅ | ✅ | ❌ |
| Container Scanning | ❌ | ❌ | ✅ | ✅ | ❌ |
| IaC Scanning | ❌ | ❌ | ❌ | ✅ | ❌ |
| Free Tier | ✅ | ✅ | ✅ | Limited | ✅ |
| Azure DevOps Native | ❌ | ✅ | ✅ | ✅ | ❌ |

## Migration from Dependabot

When migrating from GitHub Dependabot to Azure DevOps:

1. **Document current Dependabot configuration**
   - Review `.github/dependabot.yml`
   - Note update schedules
   - Document grouping rules

2. **Choose replacement tool(s)**
   - Component Governance for basic needs
   - Mend Bolt or Snyk for comprehensive scanning
   - Renovate for automated updates

3. **Configure Azure Pipelines**
   - Add scanning tasks to pipelines
   - Set up scheduled scans
   - Configure notifications

4. **Test and validate**
   - Run initial scans
   - Verify alerts are being generated
   - Test automated update PRs

5. **Update documentation**
   - Document new scanning process
   - Update team procedures
   - Train team on new tools

## Recommended Configuration for CitadelBuy

Based on the original Dependabot configuration, here's the recommended Azure DevOps setup:

### 1. Install Mend Bolt
For comprehensive vulnerability scanning

### 2. Install Renovate
For automated dependency updates with this config:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "platform": "azure",
  "repositories": ["citadelbuy"],
  "schedule": ["before 9am on Monday"],
  "timezone": "UTC",
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["minor", "patch"],
      "groupName": "dev-dependencies",
      "matchDepTypes": ["devDependencies"]
    },
    {
      "matchPackagePatterns": ["turbo", "typescript", "prettier", "eslint"],
      "groupName": "build-tools"
    },
    {
      "matchPackagePatterns": ["jest", "testing", "playwright"],
      "groupName": "test-tools"
    },
    {
      "matchPackagePatterns": ["@nestjs"],
      "groupName": "nestjs-core",
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "matchPackagePatterns": ["@prisma", "prisma"],
      "groupName": "prisma"
    },
    {
      "matchPackagePatterns": ["react", "react-dom", "@types/react"],
      "groupName": "react-ecosystem",
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "matchPackagePatterns": ["next", "eslint-config-next"],
      "groupName": "next"
    },
    {
      "matchPackagePatterns": ["@radix-ui"],
      "groupName": "radix-ui",
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "matchPackagePatterns": ["@tanstack"],
      "groupName": "tanstack"
    }
  ],
  "ignoreDeps": ["node"],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security", "dependencies"]
  },
  "automerge": false,
  "requireConfig": true
}
```

### 3. Add to CI Pipeline

```yaml
- task: ComponentGovernanceComponentDetection@0
  displayName: 'Component Detection'
  inputs:
    scanType: 'Register'
    verbosity: 'Verbose'

- task: WhiteSource@21
  displayName: 'Mend Bolt Scan'
  inputs:
    cwd: '$(System.DefaultWorkingDirectory)'
```

## Support and Resources

- [Azure DevOps Component Governance](https://docs.microsoft.com/en-us/azure/devops/organizations/settings/component-governance)
- [Mend Bolt Documentation](https://www.mend.io/bolt/)
- [Snyk Azure DevOps](https://docs.snyk.io/integrations/ci-cd-integrations/azure-pipelines-integration)
- [Renovate Documentation](https://docs.renovatebot.com/)
- [Azure DevOps Advanced Security](https://docs.microsoft.com/en-us/azure/devops/repos/security/configure-github-advanced-security-features)
