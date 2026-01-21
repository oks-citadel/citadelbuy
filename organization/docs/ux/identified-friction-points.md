# Broxiva E-Commerce Platform - Identified UX Friction Points

**Document Created:** January 5, 2026
**Author:** Agent 12 - User Researcher (UX Validation)
**Status:** Active Monitoring

---

## Overview

This document catalogs identified friction points in the Broxiva e-commerce platform user experience, their severity, status, and recommended solutions.

---

## Friction Point Categories

1. **Onboarding Friction** - Issues preventing smooth new user signup
2. **Authentication Friction** - Issues with login/logout flows
3. **Navigation Friction** - Issues finding features or products
4. **Checkout Friction** - Issues completing purchases
5. **Trust Friction** - Issues creating doubt or hesitation
6. **Accessibility Friction** - Issues for users with disabilities

---

## Detailed Friction Point Analysis

### FP-001: Missing Password Strength Feedback (Mobile)

| Attribute | Value |
|-----------|-------|
| Category | Onboarding Friction |
| Severity | Medium |
| Status | RESOLVED |
| Platform | Mobile (React Native) |
| Location | `RegisterScreen.tsx` |

**Description:**
The mobile registration screen did not provide real-time password strength feedback, while the web version did. This inconsistency created user uncertainty about password requirements.

**User Impact:**
- Users unsure if password meets requirements
- Potential for failed submissions
- Inconsistent experience across platforms

**Resolution:**
Added password strength indicator with visual progress bar and text feedback (Weak/Fair/Good/Strong).

---

### FP-002: Non-Functional Terms Links (Mobile)

| Attribute | Value |
|-----------|-------|
| Category | Trust Friction |
| Severity | Low |
| Status | RESOLVED |
| Platform | Mobile (React Native) |
| Location | `RegisterScreen.tsx` |

**Description:**
The "Terms of Service" and "Privacy Policy" text links in the registration screen were styled as links but were not actually tappable.

**User Impact:**
- Users cannot review terms before accepting
- Trust barrier for cautious users
- Potential legal compliance issue

**Resolution:**
Made links tappable using `Linking.openURL()` to open terms in device browser.

---

### FP-003: Missing Accessibility Labels (Mobile Register)

| Attribute | Value |
|-----------|-------|
| Category | Accessibility Friction |
| Severity | Medium |
| Status | RESOLVED |
| Platform | Mobile (React Native) |
| Location | `RegisterScreen.tsx` |

**Description:**
Form inputs and social login buttons lacked proper accessibility labels, making screen reader navigation difficult.

**User Impact:**
- Screen reader users cannot understand form fields
- Violates WCAG guidelines
- Excludes users with visual impairments

**Resolution:**
Added comprehensive accessibility props:
- `accessibilityLabel` on all inputs
- `accessibilityHint` for context
- `accessibilityRole` for buttons and checkboxes
- `accessibilityElementsHidden` on decorative icons

---

### FP-004: Generic Error Messages

| Attribute | Value |
|-----------|-------|
| Category | Onboarding Friction |
| Severity | Medium |
| Status | RESOLVED |
| Platform | Mobile (React Native) |
| Location | `RegisterScreen.tsx` |

**Description:**
Error messages used generic "Error" as the alert title, which doesn't help users understand what went wrong.

**Original Messages:**
- "Error" - "Please fill in all fields"
- "Error" - "Passwords do not match"
- "Error" - "Please agree to the terms and conditions"

**Improved Messages:**
- "Missing Information" - "Please fill in all required fields to create your account."
- "Password Mismatch" - "The passwords you entered do not match. Please try again."
- "Terms Required" - "Please agree to the Terms of Service and Privacy Policy to continue."

**User Impact:**
- Confusion about what action to take
- Frustration with vague feedback
- Potential abandonment

---

### FP-005: No Guest Checkout Option

| Attribute | Value |
|-----------|-------|
| Category | Checkout Friction |
| Severity | Medium |
| Status | OPEN |
| Platform | Both |
| Location | Checkout flow |

**Description:**
Users must create an account to complete a purchase. No guest checkout option is visible in the current flow.

**User Impact:**
- First-time buyers face registration barrier
- Potential cart abandonment
- Industry standard is to offer guest checkout

**Recommendation:**
Implement guest checkout with optional account creation post-purchase.

---

### FP-006: Small Touch Targets on Quantity Controls

| Attribute | Value |
|-----------|-------|
| Category | Accessibility Friction |
| Severity | Low |
| Status | OPEN |
| Platform | Mobile (React Native) |
| Location | `CartScreen.tsx` |

**Description:**
The quantity +/- buttons in the cart are 32x32 pixels, below the WCAG 2.5.5 recommended minimum of 44x44 pixels.

**User Impact:**
- Difficult to tap accurately
- Users with motor impairments affected
- Potential accidental taps

**Recommendation:**
Increase button size or add `hitSlop` prop to expand touch area.

---

### FP-007: Placeholder Text Contrast

| Attribute | Value |
|-----------|-------|
| Category | Accessibility Friction |
| Severity | Low |
| Status | OPEN |
| Platform | Both |
| Location | All form inputs |

**Description:**
Placeholder text uses `#9ca3af` color which has a contrast ratio of 2.9:1 against the input background, below the WCAG AA requirement of 4.5:1.

**User Impact:**
- Difficult to read for users with low vision
- May be invisible in bright light
- WCAG non-compliance

**Recommendation:**
Change placeholder color to `#6b7280` for 5.7:1 contrast ratio.

---

### FP-008: No Order Confirmation Email Preview

| Attribute | Value |
|-----------|-------|
| Category | Trust Friction |
| Severity | Low |
| Status | OPEN |
| Platform | Both |
| Location | Checkout success |

**Description:**
After placing an order, users see a success message but there's no preview or confirmation of what email they'll receive.

**User Impact:**
- Users unsure if order went through
- May check email repeatedly
- Anxiety about order status

**Recommendation:**
Add "We've sent a confirmation to your-email@example.com" message.

---

### FP-009: No Biometric Login Option

| Attribute | Value |
|-----------|-------|
| Category | Authentication Friction |
| Severity | Low |
| Status | OPEN |
| Platform | Mobile (React Native) |
| Location | Login screen |

**Description:**
Users must enter email and password each time. No Face ID/Touch ID option available for returning users.

**User Impact:**
- Slower repeat login experience
- More friction than competitors
- Modern expectation unmet

**Recommendation:**
Implement biometric authentication using `expo-local-authentication`.

---

### FP-010: No Session Timeout Warning

| Attribute | Value |
|-----------|-------|
| Category | Trust Friction |
| Severity | Low |
| Status | OPEN |
| Platform | Both |
| Location | All authenticated screens |

**Description:**
If a session expires, users may lose cart contents or form data without warning.

**User Impact:**
- Unexpected logouts
- Lost work in forms
- Cart abandonment

**Recommendation:**
Implement session timeout warning modal with extend option.

---

## Friction Points by Severity

### Critical (0)
None identified.

### High (0)
None identified.

### Medium (4)
| ID | Issue | Status |
|----|-------|--------|
| FP-001 | Missing Password Strength Feedback | RESOLVED |
| FP-003 | Missing Accessibility Labels | RESOLVED |
| FP-004 | Generic Error Messages | RESOLVED |
| FP-005 | No Guest Checkout Option | OPEN |

### Low (6)
| ID | Issue | Status |
|----|-------|--------|
| FP-002 | Non-Functional Terms Links | RESOLVED |
| FP-006 | Small Touch Targets | OPEN |
| FP-007 | Placeholder Contrast | OPEN |
| FP-008 | No Confirmation Email Preview | OPEN |
| FP-009 | No Biometric Login | OPEN |
| FP-010 | No Session Timeout Warning | OPEN |

---

## Resolution Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| RESOLVED | 4 | 40% |
| OPEN | 6 | 60% |
| **Total** | 10 | 100% |

---

## Priority Backlog for Open Items

### Sprint Priority 1 (Next Sprint)
1. FP-005: Guest Checkout Option
2. FP-007: Placeholder Contrast Fix

### Sprint Priority 2
3. FP-006: Touch Target Improvements
4. FP-008: Confirmation Email Preview

### Sprint Priority 3 (Future)
5. FP-009: Biometric Login
6. FP-010: Session Timeout Warning

---

## Monitoring & Measurement

### Key Metrics to Track

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Registration completion rate | >85% | TBD | Monitoring |
| Checkout abandonment rate | <25% | TBD | Monitoring |
| Login success rate (first attempt) | >95% | TBD | Monitoring |
| Accessibility complaint tickets | 0 | 0 | Green |

### User Feedback Channels
- In-app feedback form
- App store reviews
- Customer support tickets
- Analytics events

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-05 | Initial document created | Agent 12 |
| 2026-01-05 | Resolved FP-001, FP-002, FP-003, FP-004 | Agent 12 |

---

**Document Owner:** UX Research Team
**Review Frequency:** Bi-weekly sprint reviews
**Escalation Path:** Product Owner > Engineering Lead > CTO
