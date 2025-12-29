# Phone Verification Architecture

## Component Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Account Settings Page                      │
│                  (Security Tab Active)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├──► State Management
                              │    ├─ phoneVerificationStep: 'form' | 'otp' | 'verified'
                              │    ├─ verifyingPhone: string
                              │    └─ isPhoneVerified: boolean
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │   Phone Verification Section Header    │
         │   + PhoneVerificationStatus Badge      │
         └────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │  Step 1  │  │  Step 2  │  │  Step 3  │
         │  FORM    │  │   OTP    │  │ VERIFIED │
         └──────────┘  └──────────┘  └──────────┘
                │             │             │
                ▼             ▼             ▼
   ┌─────────────────┐ ┌──────────┐ ┌─────────────┐
   │ Phone           │ │ OtpInput │ │ Success     │
   │ Verification    │ │          │ │ Card        │
   │ Form            │ └──────────┘ │             │
   └─────────────────┘              └─────────────┘
```

## Step-by-Step Flow

### Step 1: Enter Phone Number

```
User Input → Validation → API Call → Success
                 │                       │
                 └──── Error ───────────┘
                           │
                           ▼
                    Show Error Toast
```

**Components:**
- `PhoneVerificationForm`
  - Input field for phone number
  - Send Code button
  - Validation logic
  - API integration

**State Transitions:**
- Initial: `step = 'form'`, `isPhoneVerified = false`
- On Success: `step = 'otp'`, `verifyingPhone = phoneNumber`

### Step 2: Enter OTP Code

```
User Types Digits → Auto-Advance → Complete?
                         │             │
                         └─── No ──────┘
                         │
                         Yes
                         │
                         ▼
                    Verify API → Success
                         │           │
                         └─ Error ───┘
                              │
                              ▼
                        Clear & Retry
```

**Components:**
- `OtpInput`
  - 6 input fields
  - Auto-focus logic
  - Paste support
  - Resend button
  - Countdown timer

**State Transitions:**
- Entry: `step = 'otp'`
- On Success: `step = 'verified'`, `isPhoneVerified = true`
- On Error: Stay on `step = 'otp'`, clear OTP

### Step 3: Verified

```
┌──────────────────────┐
│  Success Card        │
│  ✓ Verified Number   │
│  [Change Number Btn] │
└──────────────────────┘
        │
        ▼
  Change Number?
        │
        Yes
        │
        ▼
  Reset to Step 1
```

**State Transitions:**
- Display: `step = 'verified'`, `isPhoneVerified = true`
- On Change: Reset all states to initial

## Component Dependencies

```
PhoneVerificationForm
├── Card (shadcn/ui)
├── Input (shadcn/ui)
├── Button (shadcn/ui)
├── Label (shadcn/ui)
├── Phone icon (lucide-react)
├── Loader2 icon (lucide-react)
├── apiClient (API calls)
├── validatePhone (validation)
└── toast (notifications)

OtpInput
├── Card (shadcn/ui)
├── Button (shadcn/ui)
├── Label (shadcn/ui)
├── ShieldCheck icon (lucide-react)
├── CheckCircle icon (lucide-react)
├── Loader2 icon (lucide-react)
├── apiClient (API calls)
├── toast (notifications)
└── cn (styling utility)

PhoneVerificationStatus
├── Badge (shadcn/ui)
├── CheckCircle icon (lucide-react)
├── XCircle icon (lucide-react)
├── Clock icon (lucide-react)
├── AlertCircle icon (lucide-react)
├── Phone icon (lucide-react)
└── cn (styling utility)
```

## API Integration

### Endpoint 1: Send Code

```
POST /api/v1/users/phone/send-code

Request:
{
  "phoneNumber": "+1234567890"
}

Success Response (200):
{
  "message": "Verification code sent"
}

Error Response (400/500):
{
  "message": "Error message",
  "statusCode": 400
}
```

### Endpoint 2: Verify Code

```
POST /api/v1/users/phone/verify

Request:
{
  "phoneNumber": "+1234567890",
  "code": "123456"
}

Success Response (200):
{
  "verified": true,
  "message": "Phone number verified"
}

Error Response (400):
{
  "message": "Invalid code",
  "statusCode": 400
}
```

## State Management Pattern

```typescript
// Parent Component (Settings Page)
const [phoneVerificationStep, setPhoneVerificationStep] =
  useState<'form' | 'otp' | 'verified'>('form');
const [verifyingPhone, setVerifyingPhone] = useState('');
const [isPhoneVerified, setIsPhoneVerified] = useState(false);

// Callbacks passed to children
const handleCodeSent = (phone: string) => {
  setVerifyingPhone(phone);
  setPhoneVerificationStep('otp');
};

const handleVerified = () => {
  setIsPhoneVerified(true);
  setPhoneVerificationStep('verified');
  updateUser({ phone: verifyingPhone, phoneVerified: true });
};

const handleChangeNumber = () => {
  setIsPhoneVerified(false);
  setPhoneVerificationStep('form');
  setVerifyingPhone('');
};
```

## Error Handling Strategy

```
┌─────────────────────────────────────┐
│        Error Occurs                 │
└─────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
Network Error      API Error
    │                   │
    │                   ├─ 400: Validation Error
    │                   ├─ 401: Unauthorized
    │                   ├─ 429: Rate Limited
    │                   └─ 500: Server Error
    │                   │
    └────────┬──────────┘
             │
             ▼
    ┌────────────────┐
    │  Error Toast   │
    │  + Message     │
    └────────────────┘
             │
             ▼
    ┌────────────────┐
    │  Visual State  │
    │  - Red border  │
    │  - Error text  │
    └────────────────┘
             │
             ▼
    ┌────────────────┐
    │  User Action   │
    │  - Retry       │
    │  - Correct     │
    └────────────────┘
```

## Security Considerations

1. **Input Validation**
   - Client-side phone format validation
   - Country code requirement
   - Minimum length check

2. **Rate Limiting**
   - 60-second cooldown between resends
   - Visual countdown timer
   - Disabled state during cooldown

3. **Code Security**
   - No OTP storage in client state
   - Immediate verification on entry
   - Clear OTP on error
   - Server-side expiration

4. **API Security**
   - CSRF token in requests
   - Bearer token authentication
   - Error message sanitization

## Performance Optimizations

1. **Lazy Loading**
   - Components can be lazy loaded
   - No heavy dependencies

2. **Memoization**
   - Use React.memo for static components
   - useCallback for event handlers

3. **Debouncing**
   - Input validation debounced
   - API calls throttled

4. **Code Splitting**
   - Separate bundle for phone components
   - On-demand loading

## Accessibility Features

```
┌──────────────────────────────────┐
│  Keyboard Navigation             │
├──────────────────────────────────┤
│  Tab       → Move to next input  │
│  Shift+Tab → Move to prev input  │
│  Arrow →   → Next OTP field      │
│  Arrow ←   → Prev OTP field      │
│  Backspace → Clear & go back     │
│  Enter     → Submit form         │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Screen Reader Support           │
├──────────────────────────────────┤
│  ARIA labels on all inputs       │
│  Role attributes                 │
│  Status announcements            │
│  Error descriptions              │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Visual Indicators               │
├──────────────────────────────────┤
│  Focus rings                     │
│  Color contrast (WCAG AA)        │
│  Icon + text labels              │
│  Loading states                  │
└──────────────────────────────────┘
```

## Testing Strategy

```
Unit Tests
├── PhoneVerificationForm
│   ├── Renders correctly
│   ├── Validates phone format
│   ├── Handles API success
│   ├── Handles API errors
│   └── Triggers onCodeSent callback
│
├── OtpInput
│   ├── Renders 6 inputs
│   ├── Auto-advances on input
│   ├── Handles backspace
│   ├── Paste functionality
│   ├── Auto-verifies when complete
│   ├── Resend countdown
│   └── Triggers onVerified callback
│
└── PhoneVerificationStatus
    ├── Renders correct status
    ├── Shows correct icon
    ├── Displays phone number
    └── Applies correct styling

Integration Tests
├── Complete verification flow
├── API call mocking
├── State transitions
├── Error scenarios
└── User interactions

E2E Tests
├── Enter phone → Send code
├── Receive SMS → Enter OTP
├── Verify → Success state
├── Resend code flow
└── Change number flow
```

## Monitoring & Analytics

```
Events to Track:
├── phone_verification_started
├── phone_verification_code_sent
├── phone_verification_code_resent
├── phone_verification_success
├── phone_verification_failed
└── phone_verification_abandoned

Metrics:
├── Verification success rate
├── Average time to verify
├── Resend frequency
├── Error types distribution
└── Drop-off rate per step
```

## Future Enhancements

1. **Voice Call Verification**
   - Alternative to SMS
   - Better for international

2. **WhatsApp Verification**
   - Popular in some regions
   - Higher delivery rate

3. **Auto-Read SMS**
   - SMS Retriever API (Android)
   - Auto-fill credential (iOS)

4. **Multiple Phone Numbers**
   - Primary and backup
   - Different purposes

5. **Biometric Confirmation**
   - Face ID / Touch ID
   - Additional security layer
