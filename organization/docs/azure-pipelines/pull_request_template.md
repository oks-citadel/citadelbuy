# Pull Request

## Description

<!-- Provide a brief description of what this PR does and why -->

## Type of Change

<!-- Check all that apply -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)
- [ ] Documentation update
- [ ] Configuration/infrastructure change
- [ ] Dependency update

## Related Work Items

<!-- Link related work items using # followed by work item ID -->

- Fixes #
- Related to #

## Changes Made

<!-- Provide a detailed list of changes made in this PR -->

-
-
-

## Motivation and Context

<!-- Why is this change required? What problem does it solve? -->

## How Has This Been Tested?

<!-- Describe the tests you ran to verify your changes -->

### Test Configuration

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass locally

### Test Details

<!-- Provide details about your test configuration and test cases -->

**Test Coverage:**
-

**Manual Testing Steps:**
1.
2.
3.

## Screenshots / Videos

<!-- If applicable, add screenshots or videos to help explain your changes -->
<!-- UI changes should always include screenshots -->

### Before

<!-- Screenshot or description of behavior before changes -->

### After

<!-- Screenshot or description of behavior after changes -->

## Database Changes

<!-- Check if applicable and provide details -->

- [ ] Database schema changes (migrations included)
- [ ] Seed data changes
- [ ] No database changes

**Migration Details:**
<!-- If migrations are included, describe what they do -->

## API Changes

<!-- Check if applicable and provide details -->

- [ ] New endpoints added
- [ ] Existing endpoints modified
- [ ] Endpoints deprecated/removed
- [ ] No API changes

**API Changes:**
<!-- List any API changes and update Swagger docs if needed -->

## Breaking Changes

<!-- If this PR introduces breaking changes, describe them here -->
<!-- Include migration guide if needed -->

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

**Breaking Changes Details:**
<!-- What breaks and what should users do? -->

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact
- [ ] Performance improvement
- [ ] Potential performance impact (describe below)

**Performance Details:**
<!-- Include metrics if available -->

## Security Considerations

<!-- Have you considered security implications? -->

- [ ] No security implications
- [ ] Security review needed
- [ ] Security improvements included

**Security Details:**
<!-- Describe any security-related changes -->

## Dependencies

<!-- List any new dependencies or version updates -->

### New Dependencies

-

### Updated Dependencies

-

### Removed Dependencies

-

## Deployment Notes

<!-- Any special deployment considerations? -->

- [ ] No special deployment requirements
- [ ] Requires environment variable changes (document below)
- [ ] Requires infrastructure changes
- [ ] Requires data migration
- [ ] Requires feature flag

**Deployment Steps:**
<!-- If special deployment steps are needed, list them here -->

1.
2.
3.

**Required Environment Variables:**
<!-- List any new or modified environment variables -->

```bash
NEW_VAR=value
UPDATED_VAR=new_value
```

## Rollback Plan

<!-- In case something goes wrong, how do we roll back? -->

**Rollback Steps:**
1.
2.

## Documentation

<!-- Have you updated relevant documentation? -->

- [ ] Code documentation (comments, JSDoc)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] README updated
- [ ] User-facing documentation updated
- [ ] Architecture Decision Record (ADR) created
- [ ] No documentation needed

**Documentation Links:**
-

## Checklist

<!-- Check all items that apply. Reviewers will verify these items. -->

### Code Quality

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have removed any console.logs and debugging code
- [ ] I have checked for TypeScript errors (`pnpm type-check`)
- [ ] My code generates no new warnings

### Testing

- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally (`pnpm test`)
- [ ] E2E tests pass locally (`pnpm test:e2e`)
- [ ] I have tested edge cases
- [ ] I have tested error scenarios

### Code Review

- [ ] I have reviewed my own code before requesting review
- [ ] I have ensured my code is well-structured and maintainable
- [ ] I have split large changes into smaller, reviewable commits
- [ ] I have resolved all linting issues

### Dependencies & Compatibility

- [ ] My changes are backward compatible
- [ ] I have updated dependencies to latest compatible versions
- [ ] I have checked for security vulnerabilities in dependencies
- [ ] My changes work on all supported platforms (Windows, macOS, Linux)

### Documentation & Communication

- [ ] I have updated the documentation accordingly
- [ ] I have added/updated inline code comments where necessary
- [ ] I have updated API documentation (if applicable)
- [ ] I have added/updated JSDoc comments for exported functions

### Git & CI/CD

- [ ] My branch is up-to-date with the base branch
- [ ] I have resolved all merge conflicts
- [ ] All CI checks pass
- [ ] My commits follow the conventional commit format
- [ ] I have squashed unnecessary commits

### Security

- [ ] I have not committed any secrets, API keys, or sensitive data
- [ ] I have validated and sanitized all user inputs
- [ ] I have implemented proper authentication/authorization checks
- [ ] I have considered security implications of my changes

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Reviewer Notes

<!-- For reviewers: Add your comments, concerns, or approvals here -->

---

**For Reviewers:**

Please verify:
- [ ] Code follows project standards
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities introduced
- [ ] Documentation is clear and complete
- [ ] Changes are backward compatible (or breaking changes are documented)
- [ ] Performance implications are acceptable

## Post-Merge Tasks

<!-- Tasks to be completed after merging -->

- [ ] Update deployment documentation
- [ ] Notify team of changes
- [ ] Monitor production after deployment
- [ ] Update release notes
- [ ] Archive related branches

---

<!-- Thank you for contributing to CitadelBuy! -->
