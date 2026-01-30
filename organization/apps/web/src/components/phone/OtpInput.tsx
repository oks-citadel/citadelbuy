'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface OtpInputProps {
  phoneNumber: string;
  length?: number;
  onVerified?: () => void;
  onResend?: () => void;
  className?: string;
}

export function OtpInput({
  phoneNumber,
  length = 6,
  onVerified,
  onResend,
  className,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (newOtp.every((digit) => digit !== '') && newOtp.length === length) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();

    // Only process if pasted data is all digits
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, length).split('');
    const newOtp = [...otp];

    digits.forEach((digit, index) => {
      if (index < length) {
        newOtp[index] = digit;
      }
    });

    setOtp(newOtp);
    setError('');

    // Focus last filled input or next empty
    const lastIndex = Math.min(digits.length, length - 1);
    inputRefs.current[lastIndex]?.focus();

    // Auto-verify if complete code pasted
    if (digits.length === length) {
      verifyOtp(digits.join(''));
    }
  };

  const verifyOtp = async (code: string) => {
    setIsVerifying(true);
    setError('');

    try {
      await apiClient.post('/api/v1/users/phone/verify', {
        phoneNumber,
        code,
      });

      toast.success('Phone verified successfully!', {
        description: 'Your phone number has been verified.',
        icon: <CheckCircle className="h-4 w-4" />,
      });

      onVerified?.();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err.message || 'Invalid verification code';
      setError(errorMessage);
      toast.error('Verification failed', {
        description: errorMessage,
      });

      // Clear OTP on error
      setOtp(Array(length).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });

      toast.success('Code resent!', {
        description: `A new verification code has been sent to ${phoneNumber}`,
      });

      // Reset countdown
      setCountdown(60);
      setCanResend(false);

      // Clear OTP
      setOtp(Array(length).fill(''));
      inputRefs.current[0]?.focus();

      onResend?.();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err.message || 'Failed to resend code';
      setError(errorMessage);
      toast.error('Failed to resend code', {
        description: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Enter Verification Code
        </CardTitle>
        <CardDescription>
          We&apos;ve sent a 6-digit code to <strong>{phoneNumber}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Verification Code</Label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isVerifying}
                className={cn(
                  'w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2 transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  error
                    ? 'border-destructive focus:ring-destructive focus:border-destructive'
                    : 'border-input',
                  digit ? 'border-primary bg-primary/5' : ''
                )}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
          {error && (
            <p className="text-sm text-destructive text-center mt-2">{error}</p>
          )}
        </div>

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verifying code...</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the code?
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={!canResend || isResending}
            isLoading={isResending}
          >
            {isResending ? (
              'Resending...'
            ) : canResend ? (
              'Resend Code'
            ) : (
              `Resend in ${countdown}s`
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>Tip:</strong> You can paste the entire code from your SMS app, and it will auto-fill.
        </div>
      </CardContent>
    </Card>
  );
}
