# Git Workflow Guide

This document outlines the Git workflow, branching strategy, and conventions for the CitadelBuy project.

## Table of Contents

- [Branching Strategy](#branching-strategy)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Merge Strategy](#merge-strategy)
- [Release Process](#release-process)
- [Common Workflows](#common-workflows)

## Branching Strategy

We follow a modified Git Flow strategy optimized for continuous delivery.

### Main Branches

#### `main` Branch
- Production-ready code only
- Every commit represents a deployable release
- Protected branch (requires PR and approvals)
- Tagged with version numbers (e.g., `v2.0.0`)
- Direct commits not allowed

#### `develop` Branch
- Integration branch for features
- Reflects latest development changes
- Base branch for feature development
- Protected branch (requires PR)
- Automatically deploys to staging environment

### Supporting Branches

#### Feature Branches (`feature/*`)
- Used for new features
- Created from: `develop`
- Merged back into: `develop`
- Naming: `feature/short-description`
- Lifespan: Temporary (deleted after merge)

#### Bugfix Branches (`bugfix/*`)
- Used for non-critical bug fixes
- Created from: `develop`
- Merged back into: `develop`
- Naming: `bugfix/short-description`
- Lifespan: Temporary (deleted after merge)

#### Hotfix Branches (`hotfix/*`)
- Used for critical production fixes
- Created from: `main`
- Merged back into: `main` AND `develop`
- Naming: `hotfix/short-description`
- Lifespan: Temporary (deleted after merge)
- Increments patch version (e.g., 2.0.0 → 2.0.1)

#### Release Branches (`release/*`)
- Used for release preparation
- Created from: `develop`
- Merged back into: `main` AND `develop`
- Naming: `release/v2.1.0`
- Lifespan: Temporary (deleted after merge)
- Only bug fixes and release prep allowed (no new features)

## Branch Naming Conventions

### Format

```
<type>/<ticket-number>-<short-description>
```

### Examples

```bash
# Features
feature/CB-123-oauth-google-login
feature/add-product-reviews
feature/CB-456-wishlist-functionality

# Bug fixes
bugfix/CB-789-cart-total-calculation
bugfix/fix-image-upload
bugfix/resolve-race-condition

# Hotfixes
hotfix/CB-999-payment-gateway-timeout
hotfix/critical-security-patch

# Releases
release/v2.1.0
release/v2.0.1
```

### Type Prefixes

- `feature/` - New feature development
- `bugfix/` - Bug fixes for development
- `hotfix/` - Critical production fixes
- `release/` - Release preparation
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test-related changes
- `chore/` - Maintenance tasks

### Rules

1. Use lowercase letters
2. Use hyphens to separate words (not underscores)
3. Keep names short but descriptive (max 50 characters)
4. Include ticket number when applicable
5. Use present tense ("add-feature" not "added-feature")

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of the following:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring (no functional changes)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or external dependencies
- `ci`: CI/CD configuration changes
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Scope (Optional)

The scope should be the name of the affected module or feature:

- `auth` - Authentication
- `products` - Products module
- `cart` - Shopping cart
- `checkout` - Checkout process
- `payments` - Payment processing
- `api` - Backend API
- `ui` - User interface
- `db` - Database
- `config` - Configuration

### Subject

- Use imperative, present tense: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Maximum 50 characters

### Body (Optional)

- Separate from subject with blank line
- Explain what and why (not how)
- Wrap at 72 characters
- Use bullet points for multiple items

### Footer (Optional)

- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

#### Simple commit
```
feat(auth): add Google OAuth2 login
```

#### With body
```
feat(products): implement advanced filtering

- Add filter by price range
- Add filter by category
- Add filter by ratings
- Implement filter persistence in URL params
```

#### With issue reference
```
fix(cart): resolve race condition in cart updates

The cart was updating incorrectly when multiple items were added
simultaneously due to a race condition in the state management.

Fixes #789
```

#### Breaking change
```
refactor(api): restructure authentication endpoints

BREAKING CHANGE: The authentication endpoints have been restructured.
Old endpoints:
- POST /api/auth/login
- POST /api/auth/register

New endpoints:
- POST /api/v2/auth/signin
- POST /api/v2/auth/signup

Clients must update to use the new endpoints.

Closes #456
```

#### Multiple types
```
feat(checkout)!: add express checkout option

- Add one-click checkout for returning customers
- Implement saved payment methods
- Add shipping address auto-fill

BREAKING CHANGE: Checkout flow has been redesigned.
Old checkout API is deprecated and will be removed in v3.0.0.

Closes #321
```

## Pull Request Process

### Creating a Pull Request

1. **Ensure your branch is up-to-date:**
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

2. **Run pre-submission checks:**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm test:e2e
   ```

3. **Push your branch:**
   ```bash
   git push origin feature/your-feature
   ```

4. **Create PR on GitHub:**
   - Use descriptive title following commit conventions
   - Fill out the PR template completely
   - Link related issues
   - Add appropriate labels
   - Request reviewers

### PR Title Format

Follow the same format as commit messages:

```
feat(products): add product comparison feature
fix(auth): resolve token refresh issue
docs(api): update authentication documentation
```

### PR Description Template

Use the template in `.github/PULL_REQUEST_TEMPLATE/pull_request_template.md`

Key sections:
- Description
- Type of change
- Related issues
- Changes made
- Testing done
- Screenshots (for UI changes)
- Checklist

### Review Requirements

- **Automated checks**: All CI checks must pass
- **Code review**: Minimum 1 approval from maintainer
- **Testing**: Verify tests cover changes
- **Documentation**: Ensure docs are updated
- **No conflicts**: Branch must be up-to-date with base

### Addressing Review Comments

1. Make requested changes in new commits
2. Respond to all comments
3. Request re-review when ready
4. Squash fixup commits before final merge (optional)

## Merge Strategy

### Merge Types

#### 1. Squash and Merge (Default)

**When to use:**
- Feature branches → develop
- Bug fix branches → develop
- Small to medium PRs

**Advantages:**
- Clean linear history
- One commit per feature
- Easy to revert

**Command:**
```bash
git merge --squash feature/my-feature
```

#### 2. Merge Commit

**When to use:**
- Release branches → main
- Hotfix branches → main/develop
- Want to preserve detailed commit history

**Command:**
```bash
git merge --no-ff release/v2.1.0
```

#### 3. Rebase and Merge

**When to use:**
- Small PRs with clean commits
- Documentation updates
- Simple fixes

**Command:**
```bash
git rebase develop
git merge --ff-only feature/my-feature
```

### Our Policy

- **Feature → develop**: Squash and merge
- **Release → main**: Merge commit
- **Hotfix → main**: Merge commit
- **Main → develop**: Merge commit (to sync back)

## Release Process

### Version Numbers

We follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

Example: 2.1.3
```

- **MAJOR**: Breaking changes (2.0.0 → 3.0.0)
- **MINOR**: New features, backward compatible (2.0.0 → 2.1.0)
- **PATCH**: Bug fixes, backward compatible (2.0.0 → 2.0.1)

### Release Workflow

#### 1. Create Release Branch

```bash
# From develop branch
git checkout develop
git pull origin develop
git checkout -b release/v2.1.0
```

#### 2. Prepare Release

- Update version in `package.json`
- Update `CHANGELOG.md`
- Run final tests
- Fix any last-minute bugs
- Update documentation

```bash
# Update version
npm version minor # or major, patch

# Commit changes
git commit -am "chore(release): prepare v2.1.0"
```

#### 3. Create Pull Request

- Create PR from `release/v2.1.0` to `main`
- Title: `release: v2.1.0`
- Get approval from maintainers

#### 4. Merge to Main

```bash
git checkout main
git merge --no-ff release/v2.1.0
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin main --tags
```

#### 5. Merge Back to Develop

```bash
git checkout develop
git merge --no-ff release/v2.1.0
git push origin develop
```

#### 6. Clean Up

```bash
git branch -d release/v2.1.0
git push origin --delete release/v2.1.0
```

#### 7. Deploy

- Deploy to production
- Monitor for issues
- Announce release

### Hotfix Workflow

#### 1. Create Hotfix Branch

```bash
# From main branch
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix
```

#### 2. Fix the Issue

- Make minimal changes
- Focus only on the critical fix
- Add tests

```bash
git commit -m "fix: critical security vulnerability in auth"
```

#### 3. Merge to Main

```bash
git checkout main
git merge --no-ff hotfix/critical-security-fix

# Bump patch version
npm version patch

git tag -a v2.0.1 -m "Hotfix v2.0.1"
git push origin main --tags
```

#### 4. Merge to Develop

```bash
git checkout develop
git merge --no-ff hotfix/critical-security-fix
git push origin develop
```

#### 5. Clean Up and Deploy

```bash
git branch -d hotfix/critical-security-fix
git push origin --delete hotfix/critical-security-fix
```

## Common Workflows

### Starting a New Feature

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/CB-123-add-wishlist

# Make changes and commit
git add .
git commit -m "feat(products): add wishlist functionality"

# Push to remote
git push origin feature/CB-123-add-wishlist

# Create PR on GitHub
```

### Updating Feature Branch with Latest Changes

```bash
# Fetch latest changes
git fetch origin

# Rebase on develop
git checkout feature/my-feature
git rebase origin/develop

# Resolve conflicts if any
git add .
git rebase --continue

# Force push (only on feature branches!)
git push --force-with-lease origin feature/my-feature
```

### Fixing a Bug

```bash
# Create bugfix branch
git checkout develop
git checkout -b bugfix/CB-456-fix-cart-total

# Make fixes
git add .
git commit -m "fix(cart): correct tax calculation in cart total"

# Push and create PR
git push origin bugfix/CB-456-fix-cart-total
```

### Reverting a Commit

```bash
# Revert specific commit
git revert <commit-hash>

# Revert with custom message
git revert <commit-hash> -m "revert: undo feature X due to issues"

# Push
git push origin develop
```

### Cherry-Picking a Commit

```bash
# Pick commit from another branch
git checkout develop
git cherry-pick <commit-hash>

# Resolve conflicts if needed
git cherry-pick --continue

# Push
git push origin develop
```

## Best Practices

### Do's

1. **Commit often**: Small, atomic commits are easier to review and revert
2. **Write descriptive messages**: Explain why, not just what
3. **Keep branches short-lived**: Merge within a few days
4. **Test before pushing**: Ensure tests pass locally
5. **Update regularly**: Rebase on develop frequently
6. **Clean up branches**: Delete after merge

### Don'ts

1. **Don't commit secrets**: Use `.env` files (never commit them)
2. **Don't force push to shared branches**: Only force push to your feature branches
3. **Don't merge develop into feature**: Use rebase instead
4. **Don't commit generated files**: Add them to `.gitignore`
5. **Don't bypass CI checks**: Let all checks complete
6. **Don't commit commented-out code**: Remove it or use git to track history

## Troubleshooting

### Merge Conflicts

```bash
# During rebase
git rebase origin/develop

# If conflicts occur
# 1. Open conflicted files
# 2. Resolve conflicts (look for <<<<<<< markers)
# 3. Stage resolved files
git add <file>

# Continue rebase
git rebase --continue

# Or abort if needed
git rebase --abort
```

### Accidental Commit to Wrong Branch

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Switch to correct branch
git checkout correct-branch

# Commit again
git add .
git commit -m "your message"
```

### Need to Update Commit Message

```bash
# Update last commit message
git commit --amend -m "new message"

# If already pushed (feature branch only!)
git push --force-with-lease origin feature/my-feature
```

## Git Configuration

### Recommended Git Config

```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Better diff output
git config --global diff.algorithm histogram

# Automatically prune deleted remote branches
git config --global fetch.prune true

# Reuse recorded conflict resolutions
git config --global rerere.enabled true

# Default branch name
git config --global init.defaultBranch main

# Better log format
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
```

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Pro Git Book](https://git-scm.com/book/en/v2)

## Questions?

If you have questions about the Git workflow, please:
1. Check this documentation first
2. Ask in team discussions
3. Reach out to maintainers
