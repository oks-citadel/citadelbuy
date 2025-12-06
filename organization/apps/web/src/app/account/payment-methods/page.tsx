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

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

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

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={4}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddCard(false)}>
                Cancel
              </Button>
              <Button>Save Card</Button>
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
