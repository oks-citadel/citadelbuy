# Phone Verification - Quick Start Guide

## Getting Started

This guide will help you quickly integrate phone verification into your pages.

## Basic Implementation (3 Steps)

### Step 1: Import Components

```tsx
import {
  PhoneVerificationForm,
  OtpInput,
  PhoneVerificationStatus
} from '@/components/phone';
```

### Step 2: Add State Management

```tsx
const [step, setStep] = useState<'form' | 'otp' | 'verified'>('form');
const [phoneNumber, setPhoneNumber] = useState('');
const [isVerified, setIsVerified] = useState(false);
```

### Step 3: Render Components

```tsx
{/* Show status */}
<PhoneVerificationStatus
  status={isVerified ? 'verified' : 'unverified'}
  phoneNumber={isVerified ? phoneNumber : undefined}
/>

{/* Step 1: Enter phone number */}
{!isVerified && step === 'form' && (
  <PhoneVerificationForm
    onCodeSent={(phone) => {
      setPhoneNumber(phone);
      setStep('otp');
    }}
  />
)}

{/* Step 2: Enter OTP */}
{!isVerified && step === 'otp' && (
  <OtpInput
    phoneNumber={phoneNumber}
    onVerified={() => {
      setIsVerified(true);
      setStep('verified');
    }}
  />
)}

{/* Step 3: Success state */}
{isVerified && (
  <div className="text-green-600">
    Phone verified: {phoneNumber}
  </div>
)}
```

## Common Use Cases

### 1. Pre-filled Phone Number

```tsx
<PhoneVerificationForm
  initialPhone={user.phone}
  onCodeSent={(phone) => setStep('otp')}
/>
```

### 2. Custom Success Handler

```tsx
<OtpInput
  phoneNumber={phoneNumber}
  onVerified={() => {
    setIsVerified(true);
    updateUserProfile({ phoneVerified: true });
    showSuccessMessage('Phone verified!');
  }}
/>
```

### 3. Status Badge Only

```tsx
<PhoneVerificationStatus
  status="verified"
  phoneNumber="+1234567890"
  size="sm"
/>
```

### 4. Card Status Display

```tsx
import { PhoneVerificationCardStatus } from '@/components/phone';

<PhoneVerificationCardStatus
  status="verified"
  phoneNumber="+1234567890"
/>
```

## API Requirements

Ensure your backend implements these endpoints:

```typescript
// Send verification code
POST /api/v1/users/phone/send-code
Body: { phoneNumber: string }
Response: { message: string }

// Verify code
POST /api/v1/users/phone/verify
Body: { phoneNumber: string, code: string }
Response: { verified: boolean }
```

## Styling Customization

### Custom Classes

```tsx
<PhoneVerificationForm
  className="max-w-md mx-auto"
  initialPhone={phone}
/>
```

### Theme Integration

Components automatically use your Tailwind theme colors:
- Primary color for active states
- Success color for verified status
- Destructive color for errors

## Error Handling

Components handle errors automatically with toast notifications. You can add custom error handling:

```tsx
<OtpInput
  phoneNumber={phoneNumber}
  onVerified={() => {
    try {
      // Your success logic
    } catch (error) {
      console.error('Verification failed:', error);
    }
  }}
/>
```

## Testing Tips

### Development Testing

1. Use a test phone number: `+15555555555`
2. Any 6-digit code works in development mode
3. Check browser console for API calls

### Production Testing

1. Use real phone numbers
2. Check SMS delivery
3. Test international numbers
4. Verify rate limiting

## Troubleshooting

### Code not received?

- Check phone number format (needs country code)
- Verify SMS service is configured
- Check spam/blocked messages
- Wait 60 seconds before resending

### Verification fails?

- Ensure code is entered correctly
- Check if code has expired
- Verify API endpoint is correct
- Check network connection

### UI not rendering?

- Verify all imports are correct
- Check if shadcn/ui components are installed
- Ensure Tailwind CSS is configured
- Check browser console for errors

## Performance Tips

1. **Lazy load components** for faster initial page load:
```tsx
const PhoneVerificationForm = lazy(() =>
  import('@/components/phone').then(m => ({ default: m.PhoneVerificationForm }))
);
```

2. **Memoize handlers** to prevent unnecessary re-renders:
```tsx
const handleVerified = useCallback(() => {
  setIsVerified(true);
}, []);
```

3. **Prefetch API routes** for faster responses:
```tsx
useEffect(() => {
  // Prefetch send-code endpoint
  fetch('/api/v1/users/phone/send-code', { method: 'HEAD' });
}, []);
```

## Accessibility

Components are accessible by default:
- Keyboard navigation (Tab, Arrow keys)
- Screen reader support (ARIA labels)
- Focus management
- Color contrast compliance

## Mobile Optimization

- Numeric keyboard on mobile devices
- Touch-friendly input sizes
- Responsive layout
- Paste support from SMS apps

## Next Steps

1. See `README.md` for full documentation
2. Check `apps/web/src/app/account/settings/page.tsx` for live example
3. Customize styling to match your brand
4. Add analytics tracking
5. Implement additional security measures

## Support

For issues or questions:
- Check the main README.md
- Review the implementation in settings page
- Consult the API documentation
- Contact the development team
