import os
import sys

# Change to the web app directory
os.chdir('organization/apps/web/src/app')

def fix_payment_methods():
    with open('account/payment-methods/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace loadPaymentMethods function
    old_load = """  const loadPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const data = await paymentMethodsApi.getPaymentMethods();
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };"""

    new_load = """  const loadPaymentMethods = async () => {
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
  };"""

    content = content.replace(old_load, new_load)

    # Replace handleDelete function
    old_delete = """  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    try {
      await paymentMethodsApi.deletePaymentMethod(id);
      setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
    } catch (error) {
      console.error('Failed to delete payment method');
    }
  };"""

    new_delete = """  const handleDelete = async (id: string) => {
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
  };"""

    content = content.replace(old_delete, new_delete)

    # Replace handleSetDefault function
    old_set_default = """  const handleSetDefault = async (id: string) => {
    try {
      await paymentMethodsApi.setDefaultPaymentMethod(id);
      setPaymentMethods(
        paymentMethods.map((pm) => ({
          ...pm,
          isDefault: pm.id === id,
        }))
      );
    } catch (error) {
      console.error('Failed to set default payment method');
    }
  };"""

    new_set_default = """  const handleSetDefault = async (id: string) => {
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
  };"""

    content = content.replace(old_set_default, new_set_default)

    # Add error UI after loading check
    old_loading = """  if (isLoading) {
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

  return ("""

    new_loading_with_error = """  if (isLoading) {
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

  return ("""

    content = content.replace(old_loading, new_loading_with_error)

    # Update delete button
    old_delete_button = """                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>"""

    new_delete_button = """                    <Button
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
                    </Button>"""

    content = content.replace(old_delete_button, new_delete_button)

    # Update set default button
    old_default_button = """                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Set as Default
                      </Button>"""

    new_default_button = """                      <Button
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
                      </Button>"""

    content = content.replace(old_default_button, new_default_button)

    # Write back
    with open('account/payment-methods/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] Payment methods page updated successfully")

def fix_checkout():
    with open('checkout/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix shipping rates error
    old_shipping = """        } catch (error) {
          console.error('Failed to fetch shipping rates:', error);
          // Keep default shipping options on error
        }"""

    new_shipping = """        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch shipping rates';
          console.error('Failed to fetch shipping rates:', error);
          toast.error(errorMessage, {
            description: 'Using default shipping options',
          });
          // Keep default shipping options on error
        }"""

    content = content.replace(old_shipping, new_shipping)

    # Fix fraud check error
    old_fraud = """        } catch (error) {
          console.error('Fraud check failed:', error);
        }"""

    new_fraud = """        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Fraud check temporarily unavailable';
          console.error('Fraud check failed:', error);
          toast.warning(errorMessage, {
            description: 'Your transaction will proceed with additional verification',
          });
        }"""

    content = content.replace(old_fraud, new_fraud)

    # Write back
    with open('checkout/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] Checkout page updated successfully")

def fix_categories():
    with open('categories/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Update imports
    old_import = "import { Grid3X3, List, ChevronRight, Search, Sparkles, Package } from 'lucide-react';"
    new_import = "import { Grid3X3, List, ChevronRight, Search, Sparkles, Package, AlertTriangle, RefreshCw } from 'lucide-react';"
    content = content.replace(old_import, new_import)

    # Add toast import
    old_card_import = "import { Card, CardContent } from '@/components/ui/card';"
    new_card_import = """import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';"""
    content = content.replace(old_card_import, new_card_import)

    # Add error state
    old_state = "  const [isLoading, setIsLoading] = useState(true);"
    new_state = """  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);"""
    content = content.replace(old_state, new_state)

    # Fix fetchCategories
    old_fetch = """  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${apiUrl}/categories`);
        const data = await res.json();
        setCategories(data.data || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);"""

    new_fetch = """  useEffect(() => {
    const fetchCategories = async () => {
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${apiUrl}/categories`);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setCategories(data.data || []);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to fetch categories';
        console.error('Failed to fetch categories:', error);
        setError(errorMessage);
        toast.error('Failed to load categories', {
          description: errorMessage,
          action: {
            label: 'Retry',
            onClick: () => window.location.reload(),
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);"""

    content = content.replace(old_fetch, new_fetch)

    # Add error state UI
    old_loading_check = """  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return ("""

    new_loading_with_error = """  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Categories</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                Failed to Load Categories
              </h3>
              <p className="text-red-700 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return ("""

    content = content.replace(old_loading_check, new_loading_with_error)

    # Write back
    with open('categories/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] Categories page updated successfully")

if __name__ == '__main__':
    try:
        print("Applying error handling fixes...")
        fix_payment_methods()
        fix_checkout()
        fix_categories()
        print("\n[SUCCESS] All fixes applied successfully!")
    except Exception as e:
        print(f"\n[ERROR] Error: {e}", file=sys.stderr)
        sys.exit(1)
