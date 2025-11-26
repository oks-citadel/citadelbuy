'use client';

import { useState } from 'react';
import {
  Store,
  User,
  Bell,
  CreditCard,
  Shield,
  Globe,
  Palette,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  ExternalLink,
  Copy,
  Key,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';

type Tab = 'store' | 'profile' | 'notifications' | 'payments' | 'security' | 'api';

export default function VendorSettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('store');
  const [isSaving, setIsSaving] = useState(false);

  // Store settings
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'My Awesome Store',
    storeUrl: 'my-awesome-store',
    description: 'Quality products at great prices',
    email: 'store@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business St, Commerce City, CC 12345',
    logo: '',
    banner: '',
    timezone: 'America/New_York',
    currency: 'USD',
    language: 'en',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    newOrders: true,
    orderUpdates: true,
    lowStock: true,
    reviews: true,
    messages: true,
    promotions: false,
    weeklyReport: true,
    monthlyReport: true,
  });

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState({
    bankName: 'Chase Bank',
    accountNumber: '****4567',
    routingNumber: '****1234',
    paypalEmail: 'payments@example.com',
    stripeConnected: true,
    payoutSchedule: 'weekly',
    minimumPayout: 100,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const tabs = [
    { id: 'store', label: 'Store Settings', icon: Store },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-muted-foreground">
          Manage your store and account settings
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:w-64 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Store Settings */}
          {activeTab === 'store' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                  <CardDescription>
                    Basic information about your store
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo & Banner */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Store Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                          <Store className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <Button variant="outline" size="sm">
                          <Camera className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Store Banner
                      </label>
                      <div className="h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Button variant="outline" size="sm">
                          <Camera className="h-4 w-4 mr-2" />
                          Upload Banner
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Store Name
                      </label>
                      <Input
                        value={storeSettings.storeName}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, storeName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Store URL
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-sm text-muted-foreground">
                          citadelbuy.com/store/
                        </span>
                        <Input
                          value={storeSettings.storeUrl}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, storeUrl: e.target.value })
                          }
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Store Description
                      </label>
                      <textarea
                        value={storeSettings.description}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, description: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email
                      </label>
                      <Input
                        type="email"
                        value={storeSettings.email}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Phone
                      </label>
                      <Input
                        value={storeSettings.phone}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Address
                      </label>
                      <Input
                        value={storeSettings.address}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, address: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <Globe className="h-4 w-4 inline mr-1" />
                        Timezone
                      </label>
                      <select
                        value={storeSettings.timezone}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, timezone: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Currency
                      </label>
                      <select
                        value={storeSettings.currency}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, currency: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Language
                      </label>
                      <select
                        value={storeSettings.language}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, language: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your personal account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">
                      {user?.name?.charAt(0) || 'V'}
                    </span>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <Input defaultValue={user?.name || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input defaultValue={user?.email || ''} type="email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <Input value="Vendor" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Order Notifications</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'newOrders', label: 'New orders', desc: 'Get notified when you receive a new order' },
                      { key: 'orderUpdates', label: 'Order updates', desc: 'Status changes, shipping updates' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) =>
                            setNotifications({ ...notifications, [item.key]: e.target.checked })
                          }
                          className="mt-1 rounded border-gray-300"
                        />
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Inventory Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.lowStock}
                        onChange={(e) =>
                          setNotifications({ ...notifications, lowStock: e.target.checked })
                        }
                        className="mt-1 rounded border-gray-300"
                      />
                      <div>
                        <p className="font-medium text-sm">Low stock alerts</p>
                        <p className="text-xs text-muted-foreground">
                          Get notified when products are running low
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Customer Engagement</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'reviews', label: 'New reviews', desc: 'When customers leave reviews' },
                      { key: 'messages', label: 'Customer messages', desc: 'Direct messages from customers' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) =>
                            setNotifications({ ...notifications, [item.key]: e.target.checked })
                          }
                          className="mt-1 rounded border-gray-300"
                        />
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Reports</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'weeklyReport', label: 'Weekly summary', desc: 'Sales and performance recap' },
                      { key: 'monthlyReport', label: 'Monthly report', desc: 'Detailed monthly analytics' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) =>
                            setNotifications({ ...notifications, [item.key]: e.target.checked })
                          }
                          className="mt-1 rounded border-gray-300"
                        />
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Connected payment processors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-[#635BFF] flex items-center justify-center text-white font-bold">
                        S
                      </div>
                      <div>
                        <p className="font-medium">Stripe</p>
                        <p className="text-sm text-muted-foreground">Connected</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-[#003087] flex items-center justify-center text-white font-bold text-xs">
                        PP
                      </div>
                      <div>
                        <p className="font-medium">PayPal</p>
                        <p className="text-sm text-muted-foreground">
                          {paymentSettings.paypalEmail}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payout Settings</CardTitle>
                  <CardDescription>
                    How and when you receive your earnings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Bank Account</h4>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{paymentSettings.bankName}</p>
                          <p className="text-sm text-muted-foreground">
                            Account ending in {paymentSettings.accountNumber}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Update</Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Payout Schedule
                      </label>
                      <select
                        value={paymentSettings.payoutSchedule}
                        onChange={(e) =>
                          setPaymentSettings({ ...paymentSettings, payoutSchedule: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Minimum Payout ($)
                      </label>
                      <Input
                        type="number"
                        value={paymentSettings.minimumPayout}
                        onChange={(e) =>
                          setPaymentSettings({
                            ...paymentSettings,
                            minimumPayout: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Change your account password
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Current Password
                    </label>
                    <Input type="password" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        New Password
                      </label>
                      <Input type="password" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Confirm New Password
                      </label>
                      <Input type="password" />
                    </div>
                  </div>
                  <Button>Update Password</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Authenticator App</p>
                        <p className="text-sm text-muted-foreground">
                          Not configured
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">Delete Store</p>
                      <p className="text-sm text-red-700">
                        Permanently delete your store and all data
                      </p>
                    </div>
                    <Button variant="outline" className="text-red-600 border-red-300">
                      Delete Store
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* API Keys */}
          {activeTab === 'api' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for external integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">
                        Keep your API keys secure. Never share them publicly or commit them to
                        version control.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">Production API Key</p>
                          <p className="text-xs text-muted-foreground">
                            Created on Jan 15, 2024
                          </p>
                        </div>
                        <Badge>Active</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                          sk_live_****************************abcd
                        </code>
                        <Button variant="outline" size="icon">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">Test API Key</p>
                          <p className="text-xs text-muted-foreground">
                            For development only
                          </p>
                        </div>
                        <Badge variant="outline">Test</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                          sk_test_****************************efgh
                        </code>
                        <Button variant="outline" size="icon">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline">
                    <Key className="h-4 w-4 mr-2" />
                    Generate New Key
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>
                    Configure webhook endpoints for real-time events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">https://yourapp.com/webhooks</p>
                        <p className="text-sm text-muted-foreground">
                          All events
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                  </div>
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
