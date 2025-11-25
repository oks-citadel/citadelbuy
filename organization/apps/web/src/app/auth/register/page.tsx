'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, User, Phone, Loader2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const benefits = [
  'AI-powered personalized recommendations',
  'Visual search to find products instantly',
  'Virtual try-on with AR technology',
  'Price drop alerts and exclusive deals',
  'Track orders and manage returns easily',
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const { register: registerUser, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const password = watch('password');

  React.useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      toast.success('Account created successfully!');
      router.push(redirect);
    } catch {
      // Error is handled by the store
    }
  };

  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: '', color: 'bg-muted' };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { strength: 25, label: 'Weak', color: 'bg-destructive' };
    if (score <= 4) return { strength: 50, label: 'Fair', color: 'bg-warning' };
    if (score <= 5) return { strength: 75, label: 'Good', color: 'bg-info' };
    return { strength: 100, label: 'Strong', color: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-[calc(100vh-200px)] py-12">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left - Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex flex-col justify-center"
          >
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Join CitadelBuy
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Create your account and start shopping smarter
              </h1>
              <p className="text-lg text-muted-foreground">
                Join millions of shoppers enjoying AI-powered experiences
              </p>
            </div>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-3"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span>{benefit}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-muted/50 rounded-xl">
              <p className="text-sm text-muted-foreground">
                "CitadelBuy's AI recommendations helped me find exactly what I was
                looking for. The visual search feature is a game-changer!"
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div>
                  <p className="font-medium text-sm">Sarah M.</p>
                  <p className="text-xs text-muted-foreground">Member since 2023</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="text-center lg:text-left">
                <Link href="/" className="flex justify-center lg:justify-start mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-2xl">C</span>
                  </div>
                </Link>
                <CardTitle className="text-2xl">Create your account</CardTitle>
                <CardDescription>
                  Get started with personalized shopping in minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <Input
                      {...register('name')}
                      placeholder="Full name"
                      leftIcon={<User className="h-4 w-4" />}
                      error={errors.name?.message}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="Email address"
                      leftIcon={<Mail className="h-4 w-4" />}
                      error={errors.email?.message}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Input
                      {...register('phone')}
                      type="tel"
                      placeholder="Phone number (optional)"
                      leftIcon={<Phone className="h-4 w-4" />}
                      error={errors.phone?.message}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Input
                      {...register('password')}
                      type="password"
                      placeholder="Password"
                      leftIcon={<Lock className="h-4 w-4" />}
                      error={errors.password?.message}
                      disabled={isLoading}
                    />
                    {password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full ${passwordStrength.color} transition-all`}
                              style={{ width: `${passwordStrength.strength}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Input
                      {...register('confirmPassword')}
                      type="password"
                      placeholder="Confirm password"
                      leftIcon={<Lock className="h-4 w-4" />}
                      error={errors.confirmPassword?.message}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        {...register('acceptTerms')}
                        type="checkbox"
                        className="h-4 w-4 mt-1 rounded border-input"
                      />
                      <span className="text-sm text-muted-foreground">
                        I agree to the{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {errors.acceptTerms && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.acceptTerms.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By signing up, you agree to receive marketing emails. You can
                    unsubscribe at any time.
                  </p>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    href={`/auth/login${redirect !== '/' ? `?redirect=${redirect}` : ''}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
