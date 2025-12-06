# Account Lockout Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [ ] Review `account-lockout.service.ts`
- [ ] Review `admin-auth.controller.ts`
- [ ] Review changes to `auth.service.ts`
- [ ] Review changes to `auth.module.ts`
- [ ] Review changes to `local.strategy.ts`
- [ ] Verify no security issues introduced
- [ ] Check for proper error handling

### 2. Dependencies
- [ ] Redis is installed and running
- [ ] Redis connection configured in environment
- [ ] RedisModule properly imported
- [ ] Email service configured
- [ ] All npm packages installed

### 3. Configuration
- [ ] Review lockout thresholds (5 attempts default)
- [ ] Confirm lockout duration (15 minutes default)
- [ ] Verify maximum lockout (24 hours default)
- [ ] Check email templates exist
- [ ] Validate frontend URL in config

### 4. Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual test: Failed login attempts
- [ ] Manual test: Account lockout triggers
- [ ] Manual test: Lockout expiration
- [ ] Manual test: Admin unlock
- [ ] Manual test: Email notifications
- [ ] Manual test: Security logs
- [ ] Load test: Multiple concurrent attempts

## Deployment

### Development Environment
- [ ] Deploy code changes
- [ ] Verify Redis connection
- [ ] Test failed login flow
- [ ] Test lockout mechanism
- [ ] Test admin unlock
- [ ] Monitor logs for errors
- [ ] Verify email sending

### Staging Environment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Test with real email addresses
- [ ] Verify admin endpoints
- [ ] Check security logs
- [ ] Monitor for 48 hours
- [ ] Load test with realistic traffic

### Production Deployment
- [ ] Schedule maintenance window (if needed)
- [ ] Backup database
- [ ] Deploy code
- [ ] Verify Redis is running
- [ ] Test login functionality
- [ ] Monitor error logs
- [ ] Check email delivery
- [ ] Verify admin tools work

## Post-Deployment

### Immediate (First Hour)
- [ ] Monitor login success rate
- [ ] Check for lockout errors
- [ ] Verify no false positives
- [ ] Review security logs
- [ ] Monitor Redis performance
- [ ] Check email delivery rate

### First 24 Hours
- [ ] Track number of lockouts
- [ ] Identify patterns
- [ ] Review user complaints
- [ ] Check admin unlock usage
- [ ] Monitor system performance
- [ ] Verify no regression in login flow

### First Week
- [ ] Analyze lockout data
- [ ] Identify most locked accounts
- [ ] Review IP-based lockouts
- [ ] Check exponential backoff
- [ ] Gather user feedback
- [ ] Optimize thresholds if needed

## Monitoring Setup

### Metrics to Track
- [ ] Failed login attempts per minute
- [ ] Account lockouts per hour
- [ ] Most frequently locked accounts
- [ ] IP addresses with multiple lockouts
- [ ] Admin unlock operations
- [ ] Email delivery success rate

### Alerts to Configure
- [ ] Alert: Sudden spike in lockouts
- [ ] Alert: Same account locked 5+ times
- [ ] Alert: High IP-based lockout rate
- [ ] Alert: Redis connection failure
- [ ] Alert: Email delivery failures
- [ ] Alert: Abnormal failed attempt patterns

### Dashboards
- [ ] Create lockout metrics dashboard
- [ ] Add security events visualization
- [ ] Track failed attempt trends
- [ ] Monitor admin operations

## Documentation

### Update Documentation
- [ ] Add to API documentation
- [ ] Update security policies
- [ ] Document admin procedures
- [ ] Create user FAQ
- [ ] Update incident response plan

### Training
- [ ] Train support team on unlock procedure
- [ ] Document escalation process
- [ ] Create troubleshooting guide
- [ ] Share with security team

## Rollback Plan

### If Issues Occur
1. **Minor Issues** (e.g., incorrect threshold)
   - [ ] Adjust configuration
   - [ ] Restart service
   - [ ] Monitor improvements

2. **Major Issues** (e.g., breaking login)
   - [ ] Disable lockout temporarily
   - [ ] Investigate root cause
   - [ ] Fix and retest
   - [ ] Redeploy when ready

### Rollback Procedure
```bash
# 1. Revert code changes
git revert <commit-hash>

# 2. Deploy previous version
npm run build
pm2 restart api

# 3. Clear Redis lockout data (if needed)
redis-cli KEYS "auth:lockout:*" | xargs redis-cli DEL

# 4. Monitor recovery
tail -f /var/log/api/error.log
```

## Testing Checklist

### Functional Tests
- [ ] Login with correct password (should work)
- [ ] Login with wrong password 3 times (should work)
- [ ] Login with wrong password 5 times (should lock)
- [ ] Wait 15 minutes, login (should work)
- [ ] Trigger lockout, admin unlock (should work)
- [ ] Check lockout status as admin (should return data)
- [ ] View security logs as admin (should return logs)

### Security Tests
- [ ] Attempt timing attack (should fail)
- [ ] Try user enumeration (should fail)
- [ ] Test with non-existent user (should record attempt)
- [ ] Verify IP tracking works
- [ ] Test from different IPs
- [ ] Verify Redis keys expire correctly

### Edge Cases
- [ ] Lockout expires during attempt
- [ ] Multiple concurrent login attempts
- [ ] Redis connection lost
- [ ] Email service down
- [ ] Invalid email in request
- [ ] Malformed request data

## Communication

### Stakeholders to Notify
- [ ] Engineering team
- [ ] Security team
- [ ] Support team
- [ ] Product management
- [ ] Operations team

### Announcement Template
```
Subject: New Security Feature: Account Lockout

We've deployed a new security feature to protect user accounts from brute force attacks.

What's New:
- Accounts lock after 5 failed login attempts
- Automatic unlock after 15 minutes
- Email notifications for locked accounts
- Admin tools for account management

Impact:
- Improved security
- No impact on legitimate users
- Potential increase in support requests initially

Documentation:
- User FAQ: [link]
- Admin Guide: [link]
- API Docs: [link]

Questions? Contact: security@example.com
```

## Success Criteria

### Must Have (Go/No-Go)
- [x] Code deployed successfully
- [ ] Login works for valid credentials
- [ ] Lockout triggers after 5 failures
- [ ] Auto-unlock after 15 minutes
- [ ] Admin unlock works
- [ ] No critical errors in logs
- [ ] Email notifications sent

### Nice to Have
- [ ] < 1% false positive rate
- [ ] < 100ms performance impact
- [ ] Email delivery > 99%
- [ ] Zero user complaints
- [ ] Positive security team feedback

## Completion

### Sign-Off
- [ ] Engineering Lead: _______________
- [ ] Security Lead: _______________
- [ ] Operations Lead: _______________
- [ ] Product Owner: _______________

### Date Deployed
- Development: _______________
- Staging: _______________
- Production: _______________

### Notes
```
[Add any deployment notes, issues encountered, or lessons learned]
```
