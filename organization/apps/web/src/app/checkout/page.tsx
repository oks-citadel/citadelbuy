'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Truck,
  Shield,
  Lock,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Clock,
  Loader2,
  AlertTriangle,
  Sparkles,
  Gift,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { fraudDetectionService, pricingService } from '@/services/ai';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { checkoutApi, addressesApi } from '@/lib/api-client';

type CheckoutStep = 'shipping' | 'payment' | 'review';

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentMethod {
  type: 'card' | 'paypal' | 'applepay' | 'googlepay' | 'klarna';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  cardName?: string;
}

interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const shippingOptions: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    description: 'Delivered by postal service',
    price: 4.99,
    estimatedDays: '5-7 business days',
    icon: <Truck className="h-5 w-5" />,
  },
  {
    id: 'express',
    name: 'Express Shipping',
    description: 'Fast delivery with tracking',
    price: 9.99,
    estimatedDays: '2-3 business days',
    icon: <Zap className="h-5 w-5" />,
    recommended: true,
  },
  {
    id: 'overnight',
    name: 'Overnight Shipping',
    description: 'Next business day delivery',
    price: 19.99,
    estimatedDays: '1 business day',
    icon: <Clock className="h-5 w-5" />,
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [currentStep, setCurrentStep] = React.useState<CheckoutStep>('shipping');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [fraudCheckResult, setFraudCheckResult] = React.useState<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  } | null>(null);

  const [shippingAddress, setShippingAddress] = React.useState<ShippingAddress>({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const [selectedShipping, setSelectedShipping] = React.useState<string>('express');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>({
    type: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
  });

  const [giftWrap, setGiftWrap] = React.useState(false);
  const [giftMessage, setGiftMessage] = React.useState('');
  const [taxRate, setTaxRate] = React.useState(0.08); // Default 8%
  const [loadingShippingRates, setLoadingShippingRates] = React.useState(false);
  const [dynamicShippingOptions, setDynamicShippingOptions] = React.useState<ShippingOption[]>(shippingOptions);

  // Redirect if cart is empty
  React.useEffect(() => {
    if (!cart || cart.items.length === 0) {
      router.push('/cart');
    }
  }, [cart, router]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout');
    }
  }, [isAuthenticated, router]);

  // Fetch dynamic shipping rates and tax when address changes
  React.useEffect(() => {
    const fetchShippingAndTax = async () => {
      if (shippingAddress.zipCode && shippingAddress.city && shippingAddress.state) {
        setLoadingShippingRates(true);
        try {
          // Fetch dynamic shipping rates from API
          const rates = await checkoutApi.getShippingRates({
            city: shippingAddress.city,
            state: shippingAddress.state,
            zipCode: shippingAddress.zipCode,
            country: shippingAddress.country,
          });

          if (rates && rates.length > 0) {
            // Map API rates to our shipping options format
            const mappedRates: ShippingOption[] = rates.map((rate: any) => ({
              id: rate.id || rate.serviceCode,
              name: rate.name || rate.serviceName,
              description: rate.description || `Delivery via ${rate.carrier}`,
              price: rate.price || rate.amount,
              estimatedDays: rate.estimatedDays || rate.deliveryDays || '3-5 business days',
              icon: rate.isExpress ? <Zap className="h-5 w-5" /> : <Truck className="h-5 w-5" />,
              recommended: rate.recommended || false,
            }));
            setDynamicShippingOptions(mappedRates);
          }

          // Calculate tax rate based on state (US tax rates)
          const stateTaxRates: Record<string, number> = {
            'CA': 0.0725, 'NY': 0.08, 'TX': 0.0625, 'FL': 0.06, 'WA': 0.065,
            'PA': 0.06, 'IL': 0.0625, 'OH': 0.0575, 'GA': 0.04, 'NC': 0.0475,
            'MI': 0.06, 'NJ': 0.06625, 'VA': 0.053, 'AZ': 0.056, 'MA': 0.0625,
            'TN': 0.07, 'IN': 0.07, 'MO': 0.04225, 'MD': 0.06, 'WI': 0.05,
            'CO': 0.029, 'MN': 0.06875, 'SC': 0.06, 'AL': 0.04, 'LA': 0.0445,
            'KY': 0.06, 'OR': 0, 'OK': 0.045, 'CT': 0.0635, 'UT': 0.0485,
            'IA': 0.06, 'NV': 0.0685, 'AR': 0.065, 'MS': 0.07, 'KS': 0.065,
            'NM': 0.05125, 'NE': 0.055, 'WV': 0.06, 'ID': 0.06, 'HI': 0.04,
            'NH': 0, 'ME': 0.055, 'MT': 0, 'RI': 0.07, 'DE': 0,
            'SD': 0.045, 'ND': 0.05, 'AK': 0, 'VT': 0.06, 'DC': 0.06,
            'WY': 0.04,
          };
          const stateCode = shippingAddress.state.toUpperCase();
          setTaxRate(stateTaxRates[stateCode] || 0.08);
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch shipping rates';
          console.error('Failed to fetch shipping rates:', error);
          toast.error(errorMessage, {
            description: 'Using default shipping options',
          });
          // Keep default shipping options on error
        } finally {
          setLoadingShippingRates(false);
        }
      }
    };

    fetchShippingAndTax();
  }, [shippingAddress.zipCode, shippingAddress.city, shippingAddress.state, shippingAddress.country]);

  // Run fraud detection when payment info changes
  React.useEffect(() => {
    const runFraudCheck = async () => {
      if (paymentMethod.cardNumber && paymentMethod.cardNumber.length >= 16) {
        try {
          const addressForFraud = {
            city: shippingAddress.city,
            country: shippingAddress.country,
            postalCode: shippingAddress.zipCode,
          };
          const result = await fraudDetectionService.analyzeTransaction({
            orderId: '', // Will be assigned on order creation
            amount: calculateTotal(),
            paymentMethod: 'card',
            userId: user?.id || '',
            shippingAddress: addressForFraud,
            billingAddress: addressForFraud,
          });
          setFraudCheckResult({
            riskScore: result.riskScore,
            riskLevel: result.decision === 'DECLINE' ? 'high' : result.decision === 'REVIEW' ? 'medium' : 'low',
            recommendation: result.recommendations[0] || 'Transaction looks safe.',
          });
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Fraud check temporarily unavailable';
          console.error('Fraud check failed:', error);
          toast.warning(errorMessage, {
            description: 'Your transaction will proceed with additional verification',
          });
        }
      }
    };
    runFraudCheck();
  }, [paymentMethod.cardNumber, user?.id]);

  const getShippingCost = () => {
    const option = dynamicShippingOptions.find((o) => o.id === selectedShipping);
    if (!option) return 0;
    // Free shipping for orders over $50
    if ((cart?.subtotal || 0) >= 50) return 0;
    return option.price;
  };

  const calculateTax = () => {
    const subtotal = cart?.subtotal || 0;
    const discount = cart?.discount || 0;
    return (subtotal - discount) * taxRate;
  };

  const calculateTotal = () => {
    const subtotal = cart?.subtotal || 0;
    const discount = cart?.discount || 0;
    const shipping = getShippingCost();
    const giftWrapCost = giftWrap ? 4.99 : 0;
    const tax = calculateTax();
    return subtotal - discount + shipping + giftWrapCost + tax;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('review');
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    try {
      // Check for high risk fraud detection
      if (fraudCheckResult?.riskLevel === 'high') {
        toast.error('Transaction declined due to security concerns. Please contact support.');
        setIsProcessing(false);
        return;
      }

      // Step 1: Create or get shipping address
      const addressData = {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
        street: shippingAddress.address1,
        street2: shippingAddress.address2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
      };

      // Save shipping address
      let savedAddress;
      try {
        savedAddress = await addressesApi.create(addressData);
      } catch (addressError) {
        // Address might already exist, continue with checkout
        // Using existing address data
      }

      // Step 2: Create checkout session
      const checkoutItems = cart!.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        variantId: item.variant?.id,
      }));

      const sessionData = await checkoutApi.createSession({
        items: checkoutItems,
        shippingAddress: addressData,
        billingAddress: addressData,
        shippingMethod: selectedShipping,
      });

      // Step 3: Process payment based on payment method
      let paymentResult;

      if (paymentMethod.type === 'card') {
        // For card payments, we send the card details to be processed
        // In production, this should use Stripe Elements for PCI compliance
        paymentResult = await checkoutApi.processPayment(sessionData.sessionId, {
          type: 'card',
          cardNumber: paymentMethod.cardNumber,
          cardExpiry: paymentMethod.cardExpiry,
          cardCvc: paymentMethod.cardCvc,
          cardName: paymentMethod.cardName,
          amount: calculateTotal(),
          currency: 'USD',
        });
      } else if (paymentMethod.type === 'paypal') {
        // For PayPal, initiate PayPal checkout
        paymentResult = await checkoutApi.processPayment(sessionData.sessionId, {
          type: 'paypal',
          amount: calculateTotal(),
          currency: 'USD',
          returnUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout`,
        });

        // If PayPal returns a redirect URL, redirect the user
        if (paymentResult.redirectUrl) {
          window.location.href = paymentResult.redirectUrl;
          return;
        }
      } else if (paymentMethod.type === 'applepay' || paymentMethod.type === 'googlepay') {
        // For Apple Pay / Google Pay, use the native payment request
        paymentResult = await checkoutApi.processPayment(sessionData.sessionId, {
          type: paymentMethod.type,
          amount: calculateTotal(),
          currency: 'USD',
        });
      } else if (paymentMethod.type === 'klarna') {
        // For Klarna BNPL
        paymentResult = await checkoutApi.processPayment(sessionData.sessionId, {
          type: 'klarna',
          amount: calculateTotal(),
          currency: 'USD',
          returnUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout`,
        });

        if (paymentResult.redirectUrl) {
          window.location.href = paymentResult.redirectUrl;
          return;
        }
      }

      // Step 4: Handle successful payment
      if (paymentResult?.orderId) {
        // Clear cart
        await clearCart();

        // Redirect to success page with order ID
        router.push(`/checkout/success?orderId=${paymentResult.orderId}`);
        toast.success('Order placed successfully!');
      } else {
        throw new Error('Payment processing failed - no order ID returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);

      // Display user-friendly error message
      const errorMessage = error?.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);

      // If payment was declined, suggest trying a different payment method
      if (errorMessage.includes('declined') || errorMessage.includes('insufficient')) {
        toast.error('Please try a different payment method.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    { id: 'shipping', label: 'Shipping', icon: <Truck className="h-4 w-4" /> },
    { id: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'review', label: 'Review', icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const getStepIndex = (step: CheckoutStep) => steps.findIndex((s) => s.id === step);

  if (!cart || cart.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Progress Steps */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-center gap-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => {
                    if (getStepIndex(step.id as CheckoutStep) < getStepIndex(currentStep)) {
                      setCurrentStep(step.id as CheckoutStep);
                    }
                  }}
                  disabled={getStepIndex(step.id as CheckoutStep) > getStepIndex(currentStep)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full transition-colors',
                    currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : getStepIndex(step.id as CheckoutStep) < getStepIndex(currentStep)
                      ? 'bg-primary/10 text-primary cursor-pointer'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.icon}
                  <span className="font-medium">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Shipping Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleShippingSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="First name"
                            value={shippingAddress.firstName}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, firstName: e.target.value })
                            }
                            required
                          />
                          <Input
                            placeholder="Last name"
                            value={shippingAddress.lastName}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, lastName: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="email"
                            placeholder="Email"
                            value={shippingAddress.email}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, email: e.target.value })
                            }
                            required
                          />
                          <Input
                            type="tel"
                            placeholder="Phone"
                            value={shippingAddress.phone}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, phone: e.target.value })
                            }
                            required
                          />
                        </div>
                        <Input
                          placeholder="Street address"
                          value={shippingAddress.address1}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, address1: e.target.value })
                          }
                          required
                        />
                        <Input
                          placeholder="Apartment, suite, etc. (optional)"
                          value={shippingAddress.address2}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, address2: e.target.value })
                          }
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <Input
                            placeholder="City"
                            value={shippingAddress.city}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, city: e.target.value })
                            }
                            required
                          />
                          <Input
                            placeholder="State"
                            value={shippingAddress.state}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, state: e.target.value })
                            }
                            required
                          />
                          <Input
                            placeholder="ZIP code"
                            value={shippingAddress.zipCode}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, zipCode: e.target.value })
                            }
                            required
                          />
                        </div>

                        {/* Shipping Options */}
                        <div className="pt-4 border-t mt-6">
                          <h3 className="font-medium mb-4">
                            Shipping Method
                            {loadingShippingRates && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline" /> Loading rates...
                              </span>
                            )}
                          </h3>
                          <div className="space-y-3">
                            {dynamicShippingOptions.map((option) => (
                              <label
                                key={option.id}
                                className={cn(
                                  'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors',
                                  selectedShipping === option.id
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:border-muted-foreground/50'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="radio"
                                    name="shipping"
                                    value={option.id}
                                    checked={selectedShipping === option.id}
                                    onChange={(e) => setSelectedShipping(e.target.value)}
                                    className="h-4 w-4"
                                  />
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                      {option.icon}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{option.name}</span>
                                        {option.recommended && (
                                          <Badge variant="secondary" className="text-xs">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Recommended
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {option.description} • {option.estimatedDays}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="font-medium">
                                  {(cart?.subtotal || 0) >= 50 ? (
                                    <span className="text-success">Free</span>
                                  ) : (
                                    formatCurrency(option.price)
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Gift Options */}
                        <div className="pt-4 border-t">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={giftWrap}
                              onChange={(e) => setGiftWrap(e.target.checked)}
                              className="h-4 w-4 rounded"
                            />
                            <Gift className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <span className="font-medium">Add gift wrapping (+$4.99)</span>
                              <p className="text-sm text-muted-foreground">
                                Premium gift wrap with personalized message
                              </p>
                            </div>
                          </label>
                          {giftWrap && (
                            <div className="mt-3 ml-11">
                              <Input
                                placeholder="Gift message (optional)"
                                value={giftMessage}
                                onChange={(e) => setGiftMessage(e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                        <Button type="submit" size="lg" className="w-full">
                          Continue to Payment
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {currentStep === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handlePaymentSubmit} className="space-y-6">
                        {/* Payment Type Selection */}
                        <div className="grid grid-cols-5 gap-2">
                          {(['card', 'paypal', 'applepay', 'googlepay', 'klarna'] as const).map(
                            (type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setPaymentMethod({ ...paymentMethod, type })}
                                className={cn(
                                  'p-3 rounded-lg border text-center transition-colors',
                                  paymentMethod.type === type
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:border-muted-foreground/50'
                                )}
                              >
                                <span className="text-xs font-medium capitalize">{type}</span>
                              </button>
                            )
                          )}
                        </div>

                        {paymentMethod.type === 'card' && (
                          <div className="space-y-4">
                            <Input
                              placeholder="Card number"
                              value={paymentMethod.cardNumber}
                              onChange={(e) =>
                                setPaymentMethod({
                                  ...paymentMethod,
                                  cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16),
                                })
                              }
                              leftIcon={<CreditCard className="h-4 w-4" />}
                              required
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                placeholder="MM/YY"
                                value={paymentMethod.cardExpiry}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/\D/g, '');
                                  if (value.length >= 2) {
                                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                  }
                                  setPaymentMethod({ ...paymentMethod, cardExpiry: value });
                                }}
                                maxLength={5}
                                required
                              />
                              <Input
                                placeholder="CVC"
                                value={paymentMethod.cardCvc}
                                onChange={(e) =>
                                  setPaymentMethod({
                                    ...paymentMethod,
                                    cardCvc: e.target.value.replace(/\D/g, '').slice(0, 4),
                                  })
                                }
                                maxLength={4}
                                required
                              />
                            </div>
                            <Input
                              placeholder="Name on card"
                              value={paymentMethod.cardName}
                              onChange={(e) =>
                                setPaymentMethod({ ...paymentMethod, cardName: e.target.value })
                              }
                              required
                            />

                            {/* AI Fraud Detection Result */}
                            {fraudCheckResult && (
                              <div
                                className={cn(
                                  'p-4 rounded-lg flex items-start gap-3',
                                  fraudCheckResult.riskLevel === 'low'
                                    ? 'bg-success/10 text-success'
                                    : fraudCheckResult.riskLevel === 'medium'
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-destructive/10 text-destructive'
                                )}
                              >
                                {fraudCheckResult.riskLevel === 'low' ? (
                                  <Shield className="h-5 w-5 flex-shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {fraudCheckResult.riskLevel === 'low'
                                      ? 'Secure Transaction'
                                      : fraudCheckResult.riskLevel === 'medium'
                                      ? 'Additional Verification May Be Required'
                                      : 'High Risk Detected'}
                                  </p>
                                  <p className="text-sm opacity-80">
                                    {fraudCheckResult.recommendation}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {paymentMethod.type !== 'card' && (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>You will be redirected to complete payment with {paymentMethod.type}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <span>Your payment information is encrypted and secure</span>
                        </div>

                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep('shipping')}
                          >
                            Back
                          </Button>
                          <Button type="submit" className="flex-1">
                            Review Order
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {currentStep === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Shipping Review */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Shipping Address</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep('shipping')}
                      >
                        Edit
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">
                        {shippingAddress.firstName} {shippingAddress.lastName}
                      </p>
                      <p className="text-muted-foreground">
                        {shippingAddress.address1}
                        {shippingAddress.address2 && `, ${shippingAddress.address2}`}
                      </p>
                      <p className="text-muted-foreground">
                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                      </p>
                      <p className="text-muted-foreground">{shippingAddress.email}</p>
                    </CardContent>
                  </Card>

                  {/* Payment Review */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Payment Method</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep('payment')}
                      >
                        Edit
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {paymentMethod.type === 'card' ? (
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              •••• •••• •••• {paymentMethod.cardNumber?.slice(-4)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires {paymentMethod.cardExpiry}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="capitalize">{paymentMethod.type}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Items Review */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Order Items ({cart.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {cart.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-lg bg-muted" />
                          <div className="flex-1">
                            <p className="font-medium line-clamp-1">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatCurrency(item.total, item.product.currency)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('payment')}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Place Order • {formatCurrency(calculateTotal())}
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items Summary */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-lg bg-muted" />
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {item.product.name}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(cart.subtotal)}</span>
                  </div>
                  {(cart.discount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount</span>
                      <span>-{formatCurrency(cart.discount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {getShippingCost() === 0 ? (
                        <span className="text-success">Free</span>
                      ) : (
                        formatCurrency(getShippingCost())
                      )}
                    </span>
                  </div>
                  {giftWrap && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gift wrap</span>
                      <span>{formatCurrency(4.99)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({(taxRate * 100).toFixed(1)}%)
                    </span>
                    <span>
                      {formatCurrency(calculateTax())}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    <span>Encrypted</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
