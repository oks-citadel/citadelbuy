'use client';

import * as React from 'react';
import { Suspense, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { TestCredentials } from '@/components/dev/test-credentials';

// Type declarations for OAuth SDKs
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme?: string; size?: string; width?: number }
          ) => void;
        };
      };
    };
    FB?: {
      init: (config: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { accessToken: string } | null; status: string }) => void,
        options?: { scope: string }
      ) => void;
      getLoginStatus: (callback: (response: { status: string; authResponse?: { accessToken: string } | null }) => void) => void;
    };
    fbAsyncInit?: () => void;
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code: string;
          };
          user?: {
            email?: string;
            name?: { firstName?: string; lastName?: string };
          };
        }>;
      };
    };
  }
}

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Script loading utilities
const loadScript = (src: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${id} script`));
    document.head.appendChild(script);
  });
};

// Custom hook for Google Sign-In
const useGoogleAuth = (onSuccess: (token: string) => void) => {
  const isInitialized = useRef(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const initializeGoogle = useCallback(async () => {
    if (isInitialized.current || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;

    try {
      await loadScript('https://accounts.google.com/gsi/client', 'google-gsi-script');

      // Wait for the google object to be available
      await new Promise<void>((resolve) => {
        const checkGoogle = () => {
          if (window.google?.accounts?.id) {
            resolve();
          } else {
            setTimeout(checkGoogle, 100);
          }
        };
        checkGoogle();
      });

      window.google!.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            onSuccess(response.credential);
          }
        },
        auto_select: false,
      });

      isInitialized.current = true;
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error);
    }
  }, [onSuccess]);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        throw new Error('Google Client ID is not configured');
      }

      await initializeGoogle();

      if (!window.google?.accounts?.id) {
        throw new Error('Google Sign-In failed to initialize');
      }

      // Trigger the One Tap prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One Tap is not displayed, we could show an error or try alternative flow
          setIsLoading(false);
          // The prompt may have been dismissed or blocked
          console.log('Google One Tap was not displayed or was skipped');
        }
      });

      // The callback in initialize will handle the response
      // Set a timeout to reset loading state if no response
      setTimeout(() => setIsLoading(false), 30000);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, [initializeGoogle]);

  return { signIn, isLoading, setIsLoading };
};

// Custom hook for Facebook Login
const useFacebookAuth = (onSuccess: (token: string) => void) => {
  const isInitialized = useRef(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const initializeFacebook = useCallback(async () => {
    if (isInitialized.current || !process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) return;

    try {
      await loadScript('https://connect.facebook.net/en_US/sdk.js', 'facebook-jssdk');

      // Wait for FB to be available
      await new Promise<void>((resolve) => {
        const checkFB = () => {
          if (window.FB) {
            resolve();
          } else {
            // Set up the async init callback
            window.fbAsyncInit = () => {
              resolve();
            };
            setTimeout(checkFB, 100);
          }
        };
        checkFB();
      });

      window.FB!.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });

      isInitialized.current = true;
    } catch (error) {
      console.error('Failed to initialize Facebook SDK:', error);
    }
  }, []);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
        throw new Error('Facebook App ID is not configured');
      }

      await initializeFacebook();

      if (!window.FB) {
        throw new Error('Facebook SDK failed to initialize');
      }

      window.FB.login(
        (response) => {
          setIsLoading(false);
          if (response.authResponse?.accessToken) {
            onSuccess(response.authResponse.accessToken);
          } else {
            // User cancelled or error
            if (response.status !== 'connected') {
              console.log('Facebook login was cancelled or failed');
            }
          }
        },
        { scope: 'email,public_profile' }
      );
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, [initializeFacebook, onSuccess]);

  return { signIn, isLoading };
};

// Custom hook for Apple Sign-In
const useAppleAuth = (onSuccess: (token: string) => void) => {
  const isInitialized = useRef(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const initializeApple = useCallback(async () => {
    if (isInitialized.current || !process.env.NEXT_PUBLIC_APPLE_CLIENT_ID) return;

    try {
      await loadScript(
        'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
        'apple-signin-script'
      );

      // Wait for AppleID to be available
      await new Promise<void>((resolve) => {
        const checkApple = () => {
          if (window.AppleID) {
            resolve();
          } else {
            setTimeout(checkApple, 100);
          }
        };
        checkApple();
      });

      const redirectURI =
        process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ||
        `${window.location.origin}/auth/callback/apple`;

      window.AppleID!.auth.init({
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI,
        usePopup: true,
      });

      isInitialized.current = true;
    } catch (error) {
      console.error('Failed to initialize Apple Sign-In:', error);
    }
  }, []);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID) {
        throw new Error('Apple Client ID is not configured');
      }

      await initializeApple();

      if (!window.AppleID) {
        throw new Error('Apple Sign-In failed to initialize');
      }

      const response = await window.AppleID.auth.signIn();

      if (response.authorization?.id_token) {
        onSuccess(response.authorization.id_token);
      } else {
        throw new Error('No ID token received from Apple');
      }
    } catch (error) {
      // Apple throws an error if user cancels
      if ((error as { error?: string })?.error === 'popup_closed_by_user') {
        console.log('Apple Sign-In popup was closed');
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  }, [initializeApple, onSuccess]);

  return { signIn, isLoading };
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const { login, socialLogin, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const [socialLoginInProgress, setSocialLoginInProgress] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Handle successful OAuth token
  const handleOAuthSuccess = useCallback(
    async (provider: 'google' | 'facebook' | 'apple', token: string) => {
      setSocialLoginInProgress(provider);
      try {
        await socialLogin(provider, token);
        toast.success('Welcome back!');
        router.push(redirect);
      } catch (err) {
        const message = err instanceof Error ? err.message : `${provider} login failed`;
        toast.error(message);
      } finally {
        setSocialLoginInProgress(null);
      }
    },
    [socialLogin, router, redirect]
  );

  // Initialize OAuth hooks
  const googleAuth = useGoogleAuth(
    useCallback((token: string) => handleOAuthSuccess('google', token), [handleOAuthSuccess])
  );

  const facebookAuth = useFacebookAuth(
    useCallback((token: string) => handleOAuthSuccess('facebook', token), [handleOAuthSuccess])
  );

  const appleAuth = useAppleAuth(
    useCallback((token: string) => handleOAuthSuccess('apple', token), [handleOAuthSuccess])
  );

  // Reset Google loading state when OAuth success is triggered
  useEffect(() => {
    if (socialLoginInProgress === 'google') {
      googleAuth.setIsLoading(false);
    }
  }, [socialLoginInProgress, googleAuth]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      router.push(redirect);
    } catch {
      // Error is handled by the store
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      switch (provider) {
        case 'google':
          await googleAuth.signIn();
          break;
        case 'facebook':
          await facebookAuth.signIn();
          break;
        case 'apple':
          await appleAuth.signIn();
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to initialize ${provider} login`;
      toast.error(message);
    }
  };

  // Combined loading state
  const isSocialLoading =
    googleAuth.isLoading ||
    facebookAuth.isLoading ||
    appleAuth.isLoading ||
    socialLoginInProgress !== null;
  const isAnyLoading = isLoading || isSocialLoading;

  // Get loading state for specific provider
  const getProviderLoading = (provider: 'google' | 'facebook' | 'apple') => {
    if (socialLoginInProgress === provider) return true;
    switch (provider) {
      case 'google':
        return googleAuth.isLoading;
      case 'facebook':
        return facebookAuth.isLoading;
      case 'apple':
        return appleAuth.isLoading;
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4"
      >
        <Card>
          <CardHeader className="text-center">
            <Link href="/" className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">C</span>
              </div>
            </Link>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account to continue shopping
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Social Login Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={isAnyLoading}
              >
                {getProviderLoading('google') ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isAnyLoading}
              >
                {getProviderLoading('facebook') ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('apple')}
                disabled={isAnyLoading}
              >
                {getProviderLoading('apple') ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                  </svg>
                )}
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="Email address"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  disabled={isAnyLoading}
                />
              </div>

              <div>
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  error={errors.password?.message}
                  disabled={isAnyLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                  />
                  Remember me
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isAnyLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                href={`/auth/register${redirect !== '/' ? `?redirect=${redirect}` : ''}`}
                className="text-primary hover:underline font-medium"
              >
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Dev Mode: Test Credentials */}
        <div className="mt-6">
          <TestCredentials />
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-200px)] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
