'use client';

import { useEffect, useState } from 'react';
import { paymentMethodsApi } from '@/services/account-api';
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  Shield,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SavedPaymentMethod } from '@/types/extended';
import { toast } from 'sonner';

const cardBrands: Record<string, { color: string; icon: string }> = {
  visa: { color: 'bg-blue-600', icon: 'V' },
  mastercard: { color: 'bg-red-500', icon: 'MC' },
  amex: { color: 'bg-blue-400', icon: 'AX' },
  discover: { color: 'bg-orange-500', icon: 'D' },
  paypal: { color: 'bg-blue-700', icon: 'PP' },
};

// Form state interface
interface CardFormData {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  cardholderName: string;
}

// Form errors interface
interface CardFormErrors {
  cardNumber?: string;
  expiryDate?: string;
  cvc?: string;
  cardholderName?: string;
  general?: string;
}

// Initial form state
const initialFormData: CardFormData = {
  cardNumber: '',
  expiryDate: '',
  cvc: '',
  cardholderName: '',
};

// Validation helpers
const formatCardNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19);
};

const formatExpiryDate = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 2) {
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
  }
  return digits;
};

const validateCardNumber = (cardNumber: string): string | undefined => {
  const digits = cardNumber.replace(/\s/g, '');
  if (!digits) {
    return 'Card number is required';
  }
  if (digits.length < 13 || digits.length > 19) {
    return 'Card number must be 13-19 digits';
  }
  if (!/^\d+$/.test(digits)) {
    return 'Card number must contain only digits';
  }
  // Luhn algorithm validation
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    isEven = !isEven;
  }
  if (sum % 10 !== 0) {
    return 'Invalid card number';
  }
  return undefined;
};

const validateExpiryDate = (expiryDate: string): string | undefined => {
  if (!expiryDate) {
    return 'Expiry date is required';
  }
  const match = expiryDate.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    return 'Expiry date must be in MM/YY format';
  }
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  if (month < 1 || month > 12) {
    return 'Invalid month';
  }
  const now = new Date();
  const expiry = new Date(year, month - 1);
  if (expiry < now) {
    return 'Card has expired';
  }
  return undefined;
};

const validateCVC = (cvc: string): string | undefined => {
  if (!cvc) {
    return 'CVC is required';
  }
  if (!/^\d{3,4}$/.test(cvc)) {
    return 'CVC must be 3 or 4 digits';
  }
  return undefined;
};

const validateCardholderName = (name: string): string | undefined => {
  if (!name.trim()) {
    return 'Cardholder name is required';
  }
  if (name.trim().length < 2) {
    return 'Name is too short';
  }
  return undefined;
};

const detectCardBrand = (cardNumber: string): string => {
  const digits = cardNumber.replace(/\s/g, '');
  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(?:011|5)/.test(digits)) return 'discover';
  return 'unknown';
};

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CardFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<CardFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await paymentMethodsApi.getPaymentMethods();
      setPaymentMethods(data || []);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load payment methods';
      console.error('Failed to load payment methods:', error);
      setLoadError(errorMessage);
      toast.error(errorMessage, {
        description: 'Please try refreshing the page',
        action: {
          label: 'Retry',
          onClick: () => loadPaymentMethods(),
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    setDeletingId(id);
    try {
      await paymentMethodsApi.deletePaymentMethod(id);
      setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
      toast.success('Payment method removed successfully');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete payment method';
      console.error('Failed to delete payment method:', error);
      toast.error(errorMessage, {
        description: 'Please try again or contact support if the issue persists',
        action: {
          label: 'Retry',
          onClick: () => handleDelete(id),
        },
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await paymentMethodsApi.setDefaultPaymentMethod(id);
      setPaymentMethods(
        paymentMethods.map((pm) => ({
          ...pm,
          isDefault: pm.id === id,
        }))
      );
      toast.success('Default payment method updated');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to set default payment method';
      console.error('Failed to set default payment method:', error);
      toast.error(errorMessage, {
        description: 'Please try again or contact support if the issue persists',
        action: {
          label: 'Retry',
          onClick: () => handleSetDefault(id),
        },
      });
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Form input handlers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData((prev) => ({ ...prev, cardNumber: formatted }));
    if (formErrors.cardNumber) {
      setFormErrors((prev) => ({ ...prev, cardNumber: undefined }));
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setFormData((prev) => ({ ...prev, expiryDate: formatted }));
    if (formErrors.expiryDate) {
      setFormErrors((prev) => ({ ...prev, expiryDate: undefined }));
    }
  };

  const handleCVCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setFormData((prev) => ({ ...prev, cvc: value }));
    if (formErrors.cvc) {
      setFormErrors((prev) => ({ ...prev, cvc: undefined }));
    }
  };

  const handleCardholderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, cardholderName: e.target.value }));
    if (formErrors.cardholderName) {
      setFormErrors((prev) => ({ ...prev, cardholderName: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: CardFormErrors = {};

    const cardNumberError = validateCardNumber(formData.cardNumber);
    if (cardNumberError) errors.cardNumber = cardNumberError;

    const expiryDateError = validateExpiryDate(formData.expiryDate);
    if (expiryDateError) errors.expiryDate = expiryDateError;

    const cvcError = validateCVC(formData.cvc);
    if (cvcError) errors.cvc = cvcError;

    const cardholderNameError = validateCardholderName(formData.cardholderName);
    if (cardholderNameError) errors.cardholderName = cardholderNameError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setShowAddCard(false);
  };

  const handleSaveCard = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setIsSubmitting(true);
    setFormErrors((prev) => ({ ...prev, general: undefined }));

    try {
      // In production, you would first tokenize the card with Stripe/payment processor
      // and then send the token to the server. For demo purposes, we simulate this.
      const cardDigits = formData.cardNumber.replace(/\s/g, '');
      const brand = detectCardBrand(formData.cardNumber);
      const expiryParts = formData.expiryDate.split('/');

      // Create a simulated token (in production, this comes from Stripe.js)
      const simulatedToken = `tok_${brand}_${cardDigits.slice(-4)}_${Date.now()}`;

      const newPaymentMethod = await paymentMethodsApi.addPaymentMethod({
        type: 'CARD',
        token: simulatedToken,
      });

      setPaymentMethods((prev) => [...prev, newPaymentMethod]);
      toast.success('Payment method added successfully');
      resetForm();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save payment method';
      console.error('Failed to save payment method:', error);
      setFormErrors((prev) => ({ ...prev, general: errorMessage }));
      toast.error(errorMessage, {
        description: 'Please check your card details and try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAddCard = () => {
    resetForm();
  };

  const getCardBrand = (brand: string | undefined) => {
    if (!brand) return { color: 'bg-gray-500', icon: 'CC' };
    const lowerBrand = brand.toLowerCase();
    return cardBrands[lowerBrand] || { color: 'bg-gray-500', icon: brand.charAt(0).toUpperCase() };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse h-8 w-40 bg-gray-200 rounded" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-24 bg-gray-200 rounded" />
                <div className="h-16 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state UI
  if (loadError && paymentMethods.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
        </div>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Failed to Load Payment Methods
            </h3>
            <p className="text-red-700 mb-4">{loadError}</p>
            <Button onClick={loadPaymentMethods} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-gray-600 mt-1">
              Manage your saved payment methods
            </p>
          </div>
          <Button onClick={() => setShowAddCard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Your payments are secure</p>
              <p className="text-sm text-green-700 mt-1">
                We use industry-standard encryption to protect your payment
                information. Your full card number is never stored on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Card Form */}
      {showAddCard && (
        <Card>
          <CardHeader>
            <CardTitle>Add Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  In production, this would integrate with Stripe Elements or a similar
                  payment processor for secure card entry.
                </p>
              </div>
            </div>

            {/* General error message */}
            {formErrors.general && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{formErrors.general}</p>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.cardNumber
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                    maxLength={19}
                    disabled={isSubmitting}
                  />
                  {formData.cardNumber && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div
                        className={`w-8 h-5 rounded flex items-center justify-center text-white font-bold text-xs ${
                          cardBrands[detectCardBrand(formData.cardNumber)]?.color || 'bg-gray-400'
                        }`}
                      >
                        {cardBrands[detectCardBrand(formData.cardNumber)]?.icon || 'CC'}
                      </div>
                    </div>
                  )}
                </div>
                {formErrors.cardNumber && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.cardNumber}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={formData.expiryDate}
                    onChange={handleExpiryDateChange}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.expiryDate
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                    maxLength={5}
                    disabled={isSubmitting}
                  />
                  {formErrors.expiryDate && (
                    <p className="text-sm text-red-600 mt-1">{formErrors.expiryDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={formData.cvc}
                    onChange={handleCVCChange}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.cvc
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                    maxLength={4}
                    disabled={isSubmitting}
                  />
                  {formErrors.cvc && (
                    <p className="text-sm text-red-600 mt-1">{formErrors.cvc}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.cardholderName}
                  onChange={handleCardholderNameChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                    formErrors.cardholderName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {formErrors.cardholderName && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.cardholderName}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCancelAddCard}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveCard} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Card'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods List */}
      {paymentMethods.length === 0 && !showAddCard ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No payment methods saved
            </h3>
            <p className="text-gray-500 mb-6">
              Add a payment method for faster checkout
            </p>
            <Button onClick={() => setShowAddCard(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {paymentMethods.map((method) => {
            const brandInfo = method.card
              ? getCardBrand(method.card.brand)
              : method.type === 'PAYPAL'
              ? cardBrands.paypal
              : { color: 'bg-gray-500', icon: 'PM' };

            return (
              <Card
                key={method.id}
                className={method.isDefault ? 'border-primary' : ''}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${brandInfo.color}`}
                      >
                        {brandInfo.icon}
                      </div>
                      <div>
                        {method.card ? (
                          <>
                            <p className="font-semibold text-gray-900">
                              {method.card.brand} •••• {method.card.last4}
                            </p>
                            <p className="text-sm text-gray-500">
                              Expires {method.card.expiryMonth}/{method.card.expiryYear}
                            </p>
                          </>
                        ) : method.paypal ? (
                          <>
                            <p className="font-semibold text-gray-900">PayPal</p>
                            <p className="text-sm text-gray-500">{method.paypal.email}</p>
                          </>
                        ) : method.bankAccount ? (
                          <>
                            <p className="font-semibold text-gray-900">
                              {method.bankAccount.bankName}
                            </p>
                            <p className="text-sm text-gray-500">
                              •••• {method.bankAccount.last4}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-gray-900">{method.type}</p>
                        )}
                        {method.isDefault && (
                          <Badge className="mt-2 bg-primary/10 text-primary">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => handleDelete(method.id)}
                      disabled={deletingId === method.id}
                    >
                      {deletingId === method.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {!method.isDefault && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                        disabled={settingDefaultId === method.id}
                      >
                        {settingDefaultId === method.id ? (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Set as Default
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Demo Cards */}
          {paymentMethods.length === 0 && (
            <>
              <Card className="border-primary">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-sm bg-blue-600">
                      V
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Visa •••• 4242</p>
                      <p className="text-sm text-gray-500">Expires 12/25</p>
                      <Badge className="mt-2 bg-primary/10 text-primary">Default</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-sm bg-blue-700">
                      PP
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">PayPal</p>
                      <p className="text-sm text-gray-500">john@example.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Other Payment Options */}
      <Card>
        <CardHeader>
          <CardTitle>Other Payment Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <div className="w-12 h-8 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-sm mx-auto mb-2">
                PP
              </div>
              <p className="font-medium text-gray-900">PayPal</p>
              <p className="text-xs text-gray-500 mt-1">Link your PayPal account</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="w-12 h-8 rounded bg-black flex items-center justify-center text-white text-xs mx-auto mb-2">
                Apple
              </div>
              <p className="font-medium text-gray-900">Apple Pay</p>
              <p className="text-xs text-gray-500 mt-1">Use at checkout</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="w-12 h-8 rounded bg-white border flex items-center justify-center text-gray-800 text-xs mx-auto mb-2">
                G Pay
              </div>
              <p className="font-medium text-gray-900">Google Pay</p>
              <p className="text-xs text-gray-500 mt-1">Use at checkout</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
