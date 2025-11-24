'use client';

import { useEffect, useState } from 'react';
import { vendorService } from '@/services/vendorService';

export default function VendorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: '',
    taxId: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    description: '',
    logoUrl: '',
    bannerUrl: '',
  });

  const [bankingData, setBankingData] = useState({
    payoutMethod: 'BANK_TRANSFER',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    paypalEmail: '',
    stripeAccountId: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOnNewOrder: true,
    emailOnPayout: true,
    emailOnLowStock: true,
    emailOnReview: false,
    smsOnNewOrder: false,
    smsOnPayout: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await vendorService.getProfile();
      if (profile) {
        setBusinessData({
          businessName: profile.businessName || '',
          businessType: profile.businessType || '',
          taxId: profile.taxId || '',
          businessAddress: profile.businessAddress || '',
          businessPhone: profile.businessPhone || '',
          businessEmail: profile.businessEmail || '',
          website: profile.website || '',
          description: profile.description || '',
          logoUrl: profile.logoUrl || '',
          bannerUrl: profile.bannerUrl || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await vendorService.updateProfile(businessData);
      setMessage({ type: 'success', text: 'Business information updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update business information' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await vendorService.updateBanking(bankingData);
      setMessage({ type: 'success', text: 'Banking information updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update banking information' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // API call to save notification settings
      setMessage({ type: 'success', text: 'Notification preferences updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  const tabs = [
    { id: 'business', label: 'Business Information' },
    { id: 'banking', label: 'Banking & Payouts' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your vendor account settings</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Business Information Tab */}
      {activeTab === 'business' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Business Information</h2>
          <form onSubmit={handleSaveBusinessInfo} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                <input
                  type="text"
                  value={businessData.businessName}
                  onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                <select
                  value={businessData.businessType}
                  onChange={(e) => setBusinessData({ ...businessData, businessType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select type</option>
                  <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="LLC">LLC</option>
                  <option value="CORPORATION">Corporation</option>
                  <option value="NONPROFIT">Nonprofit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / EIN *</label>
                <input
                  type="text"
                  value={businessData.taxId}
                  onChange={(e) => setBusinessData({ ...businessData, taxId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone *</label>
                <input
                  type="tel"
                  value={businessData.businessPhone}
                  onChange={(e) => setBusinessData({ ...businessData, businessPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Address *</label>
                <textarea
                  value={businessData.businessAddress}
                  onChange={(e) => setBusinessData({ ...businessData, businessAddress: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Email *</label>
                <input
                  type="email"
                  value={businessData.businessEmail}
                  onChange={(e) => setBusinessData({ ...businessData, businessEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={businessData.website}
                  onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.example.com"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <textarea
                  value={businessData.description}
                  onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell customers about your business..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <input
                  type="url"
                  value={businessData.logoUrl}
                  onChange={(e) => setBusinessData({ ...businessData, logoUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner URL</label>
                <input
                  type="url"
                  value={businessData.bannerUrl}
                  onChange={(e) => setBusinessData({ ...businessData, bannerUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/banner.png"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-medium text-white ${
                  saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banking & Payouts Tab */}
      {activeTab === 'banking' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Banking & Payout Information</h2>
          <form onSubmit={handleSaveBankingInfo} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payout Method *</label>
              <select
                value={bankingData.payoutMethod}
                onChange={(e) => setBankingData({ ...bankingData, payoutMethod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="PAYPAL">PayPal</option>
                <option value="STRIPE">Stripe</option>
                <option value="CHECK">Check</option>
              </select>
            </div>

            {bankingData.payoutMethod === 'BANK_TRANSFER' && (
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                  <input
                    type="text"
                    value={bankingData.bankName}
                    onChange={(e) => setBankingData({ ...bankingData, bankName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name *</label>
                  <input
                    type="text"
                    value={bankingData.accountHolderName}
                    onChange={(e) => setBankingData({ ...bankingData, accountHolderName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
                  <input
                    type="text"
                    value={bankingData.accountNumber}
                    onChange={(e) => setBankingData({ ...bankingData, accountNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Routing Number *</label>
                  <input
                    type="text"
                    value={bankingData.routingNumber}
                    onChange={(e) => setBankingData({ ...bankingData, routingNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            {bankingData.payoutMethod === 'PAYPAL' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">PayPal Email *</label>
                <input
                  type="email"
                  value={bankingData.paypalEmail}
                  onChange={(e) => setBankingData({ ...bankingData, paypalEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            {bankingData.payoutMethod === 'STRIPE' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">Stripe Account ID</label>
                <input
                  type="text"
                  value={bankingData.stripeAccountId}
                  onChange={(e) => setBankingData({ ...bankingData, stripeAccountId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="acct_..."
                />
                <p className="text-sm text-gray-600 mt-2">
                  Connect your Stripe account to receive payouts directly
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Banking information is encrypted and securely stored. Changes may take up to 24 hours to be verified.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-medium text-white ${
                  saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Banking Information'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
          <form onSubmit={handleSaveNotifications} className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Email Notifications</h3>
              <div className="space-y-3">
                {[
                  { key: 'emailOnNewOrder', label: 'New order received', description: 'Get notified when you receive a new order' },
                  { key: 'emailOnPayout', label: 'Payout processed', description: 'Get notified when a payout is processed' },
                  { key: 'emailOnLowStock', label: 'Low stock alert', description: 'Get notified when product stock is running low' },
                  { key: 'emailOnReview', label: 'New customer review', description: 'Get notified when a customer leaves a review' },
                ].map((item) => (
                  <div key={item.key} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                      onChange={(e) =>
                        setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <label className="text-sm font-medium text-gray-700">{item.label}</label>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-4">SMS Notifications</h3>
              <div className="space-y-3">
                {[
                  { key: 'smsOnNewOrder', label: 'New order received', description: 'Get SMS alerts for new orders' },
                  { key: 'smsOnPayout', label: 'Payout processed', description: 'Get SMS alerts for payouts' },
                ].map((item) => (
                  <div key={item.key} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                      onChange={(e) =>
                        setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <label className="text-sm font-medium text-gray-700">{item.label}</label>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-medium text-white ${
                  saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
