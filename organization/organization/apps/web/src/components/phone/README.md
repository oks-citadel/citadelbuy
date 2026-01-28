# Phone Verification Components

This directory contains the UI components for phone number verification in the Broxiva web application.

## Components

### 1. PhoneVerificationForm

A form component that allows users to enter their phone number and request a verification code.

**Features:**
- Phone number input with validation
- Country code support
- Loading states
- Error handling with toast notifications
- Keyboard navigation (Enter to submit)

**Props:**
```typescript
interface PhoneVerificationFormProps {
  initialPhone?: string;           // Pre-filled phone number
  onCodeSent?: (phoneNumber: string) => void;  // Callback when code is sent
  onVerified?: () => void;          // Callback when verification is complete
  className?: string;               // Additional CSS classes
}
```

**Usage:**
```tsx
import { PhoneVerificationForm } from '@/components/phone';

<PhoneVerificationForm
  initialPhone="+1234567890"
  onCodeSent={(phone) => console.log('Code sent to:', phone)}
/>
```

### 2. OtpInput

A 6-digit OTP input component with auto-focus and paste support.

**Features:**
- 6 individual digit inputs with auto-focus
- Keyboard navigation (Arrow keys, Backspace)
- Paste support (auto-fills all digits)
- Auto-verification when all digits are entered
- Resend code functionality with countdown timer (60 seconds)
- Loading states
- Error handling

**Props:**
```typescript
interface OtpInputProps {
  phoneNumber: string;              // Phone number being verified
  length?: number;                  // Number of digits (default: 6)
  onVerified?: () => void;          // Callback when verification succeeds
  onResend?: () => void;            // Callback when code is resent
  className?: string;               // Additional CSS classes
}
```

**Usage:**
```tsx
import { OtpInput } from '@/components/phone';

<OtpInput
  phoneNumber="+1234567890"
  onVerified={() => console.log('Phone verified!')}
/>
```

### 3. PhoneVerificationStatus

A badge component that displays the phone verification status.

**Features:**
- Multiple status variants (verified, unverified, pending, failed)
- Icons and color-coded badges
- Optional phone number display
- Responsive sizing

**Status Types:**
- `verified` - Phone number is verified (green)
- `unverified` - Phone number not verified (gray)
- `pending` - Verification in progress (amber)
- `failed` - Verification failed (red)

**Props:**
```typescript
interface PhoneVerificationStatusProps {
  status: PhoneVerificationStatus;  // Verification status
  phoneNumber?: string;             // Phone number to display
  className?: string;               // Additional CSS classes
  showIcon?: boolean;               // Show status icon (default: true)
  size?: 'sm' | 'default' | 'lg';  // Badge size
}
```

**Usage:**
```tsx
import { PhoneVerificationStatus } from '@/components/phone';

<PhoneVerificationStatus
  status="verified"
  phoneNumber="+1234567890"
/>
```

### 4. PhoneVerificationCardStatus

A card-style status display with more detailed information.

**Props:**
```typescript
interface PhoneVerificationCardStatusProps {
  status: PhoneVerificationStatus;
  phoneNumber?: string;
  className?: string;
}
```

**Usage:**
```tsx
import { PhoneVerificationCardStatus } from '@/components/phone';

<PhoneVerificationCardStatus
  status="verified"
  phoneNumber="+1234567890"
/>
```

## API Endpoints

The components integrate with the following backend API endpoints:

- **POST /api/v1/users/phone/send-code** - Send verification code
  - Body: `{ phoneNumber: string }`
  - Response: Success message

- **POST /api/v1/users/phone/verify** - Verify the code
  - Body: `{ phoneNumber: string, code: string }`
  - Response: Verification status

## Integration Example

Here's how the components are integrated in the account settings page:

```tsx
import { PhoneVerificationForm, OtpInput, PhoneVerificationStatus } from '@/components/phone';

export default function SettingsPage() {
  const [step, setStep] = useState<'form' | 'otp' | 'verified'>('form');
  const [phone, setPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  return (
    <div>
      <PhoneVerificationStatus
        status={isVerified ? 'verified' : 'unverified'}
        phoneNumber={isVerified ? phone : undefined}
      />

      {!isVerified && step === 'form' && (
        <PhoneVerificationForm
          onCodeSent={(phoneNumber) => {
            setPhone(phoneNumber);
            setStep('otp');
          }}
        />
      )}

      {!isVerified && step === 'otp' && (
        <OtpInput
          phoneNumber={phone}
          onVerified={() => {
            setIsVerified(true);
            setStep('verified');
          }}
        />
      )}
    </div>
  );
}
```

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui components (Card, Button, Input, Badge, Label)
- Lucide React icons
- Consistent color scheme with the Broxiva design system

## Toast Notifications

Components use `sonner` for toast notifications:
- Success messages when code is sent/verified
- Error messages for validation/API failures
- Informative descriptions

## Accessibility

- Proper ARIA labels for screen readers
- Keyboard navigation support
- Focus management for better UX
- Semantic HTML structure

## Phone Number Validation

The components use the `validatePhone` utility from `@/lib/utils`:
- Requires country code (e.g., +1, +44)
- Minimum 10 digits
- Supports international formats

## Error Handling

- Client-side validation before API calls
- Server error messages displayed to users
- Toast notifications for user feedback
- Visual error states in form inputs
