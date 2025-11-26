'use client';

import { useState } from 'react';
import {
  Settings,
  Store,
  Globe,
  CreditCard,
  Mail,
  Bell,
  Shield,
  Palette,
  Users,
  FileText,
  Truck,
  Percent,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Tab = 'general' | 'payments' | 'shipping' | 'taxes' | 'notifications' | 'security' | 'appearance';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isSaving, setIsSaving] = useState(false);

  const [generalSettings, setGeneralSettings] = useState({
    storeName: 'CitadelBuy',
    storeEmail: 'support@citadelbuy.com',
    storePhone: '+1 (800) 123-4567',
    storeAddress: '123 Commerce St, New York, NY 10001',
    currency: 'USD',
    timezone: 'America/New_York',
    language: 'en',
    metaTitle: 'CitadelBuy - Your One-Stop Shop',
    metaDescription: 'Find the best products at great prices',
  });

  const [paymentSettings, setPaymentSettings] = useState({
    stripeEnabled: true,
    paypalEnabled: true,
    bnplEnabled: true,
    cryptoEnabled: false,
    commissionRate: 10,
    minPayout: 50,
  });

  const [shippingSettings, setShippingSettings] = useState({
    freeShippingThreshold: 50,
    defaultShippingRate: 5.99,
    expressRate: 14.99,
    internationalEnabled: true,
    pickupEnabled: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'taxes', label: 'Taxes', icon: Percent },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-muted-foreground">
          Configure your marketplace settings
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
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
          {/* General Settings */}
          {activeTab === 'general' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                  <CardDescription>Basic details about your store</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Store Name</label>
                      <Input
                        value={generalSettings.storeName}
                        onChange={(e) =>
                          setGeneralSettings({ ...generalSettings, storeName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Support Email</label>
                      <Input
                        type="email"
                        value={generalSettings.storeEmail}
                        onChange={(e) =>
                          setGeneralSettings({ ...generalSettings, storeEmail: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone Number</label>
                      <Input
                        value={generalSettings.storePhone}
                        onChange={(e) =>
                          setGeneralSettings({ ...generalSettings, storePhone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <Input
                        value={generalSettings.storeAddress}
                        onChange={(e) =>
                          setGeneralSettings({ ...generalSettings, storeAddress: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Settings</CardTitle>
                  <CardDescription>Currency, timezone, and language preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Currency</label>
                      <select
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={generalSettings.currency}
                        onChange={(e) =>
                          setGeneralSettings({ ...generalSettings, currency: e.target.value })
                        }
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Timezone</label>
                      <select
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={generalSettings.timezone}
                        onChange={(e) =>
                          setGeneralSettings({ ...generalSettings, timezone: e.target.value })
                        }
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Language</label>
                      <select
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={generalSettings.language}
                        onChange={(e) =>
                          setGeneralSettings({ ...generalSettings, language: e.target.value })
                        }
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

              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>Optimize your store for search engines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Meta Title</label>
                    <Input
                      value={generalSettings.metaTitle}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, metaTitle: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {generalSettings.metaTitle.length}/60 characters
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Meta Description</label>
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                      value={generalSettings.metaDescription}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, metaDescription: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {generalSettings.metaDescription.length}/160 characters
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Configure accepted payment methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'stripeEnabled', label: 'Stripe', desc: 'Credit/Debit cards' },
                    { key: 'paypalEnabled', label: 'PayPal', desc: 'PayPal payments' },
                    { key: 'bnplEnabled', label: 'Buy Now Pay Later', desc: 'Klarna, Afterpay' },
                    { key: 'cryptoEnabled', label: 'Cryptocurrency', desc: 'Bitcoin, Ethereum' },
                  ].map((method) => (
                    <div
                      key={method.key}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{method.label}</p>
                        <p className="text-sm text-muted-foreground">{method.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentSettings[method.key as keyof typeof paymentSettings] as boolean}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              [method.key]: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Commission & Payouts</CardTitle>
                  <CardDescription>Vendor commission and payout settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Commission Rate (%)
                      </label>
                      <Input
                        type="number"
                        value={paymentSettings.commissionRate}
                        onChange={(e) =>
                          setPaymentSettings({
                            ...paymentSettings,
                            commissionRate: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Minimum Payout ($)
                      </label>
                      <Input
                        type="number"
                        value={paymentSettings.minPayout}
                        onChange={(e) =>
                          setPaymentSettings({
                            ...paymentSettings,
                            minPayout: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Shipping Settings */}
          {activeTab === 'shipping' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Rates</CardTitle>
                  <CardDescription>Configure shipping options and rates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Free Shipping Threshold ($)
                      </label>
                      <Input
                        type="number"
                        value={shippingSettings.freeShippingThreshold}
                        onChange={(e) =>
                          setShippingSettings({
                            ...shippingSettings,
                            freeShippingThreshold: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Standard Rate ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={shippingSettings.defaultShippingRate}
                        onChange={(e) =>
                          setShippingSettings({
                            ...shippingSettings,
                            defaultShippingRate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Express Rate ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={shippingSettings.expressRate}
                        onChange={(e) =>
                          setShippingSettings({
                            ...shippingSettings,
                            expressRate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    {[
                      { key: 'internationalEnabled', label: 'International Shipping', desc: 'Ship to international addresses' },
                      { key: 'pickupEnabled', label: 'In-Store Pickup', desc: 'Allow customers to pick up orders' },
                    ].map((option) => (
                      <div
                        key={option.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shippingSettings[option.key as keyof typeof shippingSettings] as boolean}
                            onChange={(e) =>
                              setShippingSettings({
                                ...shippingSettings,
                                [option.key]: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Placeholder for other tabs */}
          {(activeTab === 'taxes' || activeTab === 'notifications' || activeTab === 'security' || activeTab === 'appearance') && (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">
                  {tabs.find((t) => t.id === activeTab)?.label} Settings
                </h3>
                <p className="text-muted-foreground">
                  This section is under development. Check back soon!
                </p>
              </CardContent>
            </Card>
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
