'use client';

import { useEffect, useState } from 'react';
import { useGiftCardsStore } from '@/stores/account-store';
import {
  Gift,
  CreditCard,
  Send,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const giftCardDesigns = [
  { id: 'birthday', name: 'Birthday', color: 'from-pink-500 to-purple-500' },
  { id: 'thank-you', name: 'Thank You', color: 'from-green-500 to-teal-500' },
  { id: 'holiday', name: 'Holiday', color: 'from-red-500 to-orange-500' },
  { id: 'celebration', name: 'Celebration', color: 'from-blue-500 to-indigo-500' },
];

const amounts = [25, 50, 75, 100, 150, 200];

export default function GiftCardsPage() {
  const {
    myGiftCards,
    storeCredit,
    isLoading,
    fetchMyGiftCards,
    fetchStoreCredit,
    purchaseGiftCard,
    redeemGiftCard,
    checkBalance,
  } = useGiftCardsStore();

  const [activeTab, setActiveTab] = useState<'buy' | 'redeem' | 'my-cards' | 'credit'>('buy');
  const [selectedDesign, setSelectedDesign] = useState(giftCardDesigns[0].id);
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [checkCode, setCheckCode] = useState('');
  const [balanceResult, setBalanceResult] = useState<{
    balance: number;
    currency: string;
  } | null>(null);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    creditsAdded: number;
  } | null>(null);

  useEffect(() => {
    fetchMyGiftCards();
    fetchStoreCredit();
  }, [fetchMyGiftCards, fetchStoreCredit]);

  const handlePurchase = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (amount < 10 || amount > 500) {
      alert('Amount must be between $10 and $500');
      return;
    }
    if (!recipientEmail) {
      alert('Please enter recipient email');
      return;
    }
    await purchaseGiftCard({
      amount,
      recipientEmail,
      recipientName,
      senderName,
      message,
      designTemplate: selectedDesign,
    });
    // Reset form
    setRecipientEmail('');
    setRecipientName('');
    setSenderName('');
    setMessage('');
    setCustomAmount('');
    setActiveTab('my-cards');
  };

  const handleCheckBalance = async () => {
    if (!checkCode.trim()) return;
    const result = await checkBalance(checkCode.trim());
    setBalanceResult(result);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    const result = await redeemGiftCard(redeemCode.trim());
    setRedeemResult(result);
    if (result.success) {
      setRedeemCode('');
      fetchStoreCredit();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'USED':
        return 'bg-gray-100 text-gray-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gift Cards</h1>
            <p className="text-gray-600 mt-1">
              Buy, redeem, and manage gift cards
            </p>
          </div>
          {storeCredit && (
            <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-lg">
              <Wallet className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-gray-600">Store Credit</p>
                <p className="font-bold text-primary">
                  ${storeCredit.balance.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'buy', label: 'Buy Gift Card', icon: Gift },
            { id: 'redeem', label: 'Redeem', icon: CreditCard },
            { id: 'my-cards', label: 'My Gift Cards', icon: Send },
            { id: 'credit', label: 'Store Credit', icon: Wallet },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="whitespace-nowrap"
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Buy Tab */}
      {activeTab === 'buy' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create a Gift Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Design Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a Design
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {giftCardDesigns.map((design) => (
                    <button
                      key={design.id}
                      onClick={() => setSelectedDesign(design.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedDesign === design.id
                          ? 'border-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`h-16 rounded-lg bg-gradient-to-r ${design.color} mb-2`}
                      />
                      <p className="text-sm font-medium text-gray-900">
                        {design.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Amount
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {amounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                        selectedAmount === amount && !customAmount
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Custom amount ($10-$500)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min={10}
                  max={500}
                />
              </div>

              {/* Recipient Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="friend@email.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Name
                  </label>
                  <Input
                    placeholder="Friend's name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <Input
                    placeholder="Your name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message
                  </label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Add a personal message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handlePurchase}>
                Purchase Gift Card - ${customAmount || selectedAmount}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="hidden md:block">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`rounded-xl p-6 bg-gradient-to-r ${
                    giftCardDesigns.find((d) => d.id === selectedDesign)?.color
                  } text-white shadow-lg`}
                >
                  <div className="flex justify-between items-start mb-8">
                    <Gift className="w-10 h-10" />
                    <span className="text-3xl font-bold">
                      ${customAmount || selectedAmount}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">Gift Card</p>
                    {recipientName && (
                      <p className="text-sm opacity-90">For: {recipientName}</p>
                    )}
                    {senderName && (
                      <p className="text-sm opacity-90">From: {senderName}</p>
                    )}
                  </div>
                  {message && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-sm italic">"{message}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Redeem Tab */}
      {activeTab === 'redeem' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Redeem a Gift Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gift Card Code
                </label>
                <Input
                  placeholder="Enter your gift card code"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              <Button className="w-full" onClick={handleRedeem}>
                Redeem Gift Card
              </Button>

              {redeemResult && (
                <div
                  className={`p-4 rounded-lg ${
                    redeemResult.success
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {redeemResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>
                        ${redeemResult.creditsAdded.toFixed(2)} added to your store
                        credit!
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Invalid or already used gift card code</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Check Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gift Card Code
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code to check balance"
                    value={checkCode}
                    onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button onClick={handleCheckBalance}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {balanceResult && (
                <div className="p-4 rounded-lg bg-blue-50">
                  <p className="text-sm text-blue-600 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-blue-800">
                    ${balanceResult.balance.toFixed(2)} {balanceResult.currency}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Cards Tab */}
      {activeTab === 'my-cards' && (
        <Card>
          <CardHeader>
            <CardTitle>My Gift Cards</CardTitle>
          </CardHeader>
          <CardContent>
            {myGiftCards.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No gift cards yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Purchase a gift card to surprise someone special
                </p>
                <Button onClick={() => setActiveTab('buy')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Buy Gift Card
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myGiftCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-10 rounded bg-gradient-to-r ${
                          giftCardDesigns.find(
                            (d) => d.id === card.designTemplate
                          )?.color || 'from-gray-400 to-gray-500'
                        }`}
                      />
                      <div>
                        <p className="font-mono font-medium text-gray-900">
                          {card.code}
                        </p>
                        <p className="text-sm text-gray-500">
                          {card.recipientEmail && `To: ${card.recipientEmail}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          ${card.currentBalance.toFixed(2)}
                        </span>
                        {card.currentBalance < card.initialBalance && (
                          <span className="text-sm text-gray-500">
                            / ${card.initialBalance.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <Badge className={getStatusBadge(card.status)}>
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Store Credit Tab */}
      {activeTab === 'credit' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available Balance</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${storeCredit?.balance.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setActiveTab('redeem')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credit
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credit History</CardTitle>
            </CardHeader>
            <CardContent>
              {storeCredit?.history && storeCredit.history.length > 0 ? (
                <div className="space-y-4">
                  {storeCredit.history.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'CREDIT'
                              ? 'bg-green-100'
                              : 'bg-red-100'
                          }`}
                        >
                          {transaction.type === 'CREDIT' ? (
                            <Plus className="w-4 h-4 text-green-600" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold ${
                          transaction.type === 'CREDIT'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'CREDIT' ? '+' : '-'}$
                        {Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
