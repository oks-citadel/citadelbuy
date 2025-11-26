'use client';

import { useEffect, useState } from 'react';
import { useLoyaltyStore } from '@/stores/account-store';
import {
  Award,
  Gift,
  Users,
  TrendingUp,
  Star,
  Crown,
  ChevronRight,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const tierConfig = {
  BRONZE: {
    color: 'from-amber-600 to-amber-700',
    icon: Star,
    benefits: ['1 point per $1', 'Birthday bonus', 'Member-only deals'],
  },
  SILVER: {
    color: 'from-gray-400 to-gray-500',
    icon: Star,
    benefits: [
      '1.25 points per $1',
      'Birthday bonus',
      'Free shipping over $50',
      'Early sale access',
    ],
  },
  GOLD: {
    color: 'from-yellow-500 to-yellow-600',
    icon: Crown,
    benefits: [
      '1.5 points per $1',
      'Double birthday bonus',
      'Free shipping',
      'Early sale access',
      'Exclusive offers',
    ],
  },
  PLATINUM: {
    color: 'from-gray-700 to-gray-900',
    icon: Crown,
    benefits: [
      '2 points per $1',
      'Triple birthday bonus',
      'Free express shipping',
      'Priority support',
      'Exclusive offers',
      'VIP events',
    ],
  },
};

export default function LoyaltyPage() {
  const {
    account,
    rewards,
    redemptions,
    referrals,
    isLoading,
    fetchAccount,
    fetchRewards,
    fetchRedemptions,
    fetchReferrals,
    redeemReward,
    createReferral,
  } = useLoyaltyStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'history' | 'referrals'>(
    'overview'
  );
  const [referralEmail, setReferralEmail] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    fetchAccount();
    fetchRewards();
    fetchRedemptions();
    fetchReferrals();
  }, [fetchAccount, fetchRewards, fetchRedemptions, fetchReferrals]);

  const handleCopyReferral = () => {
    const referralCode = referrals[0]?.code || 'YOUR_CODE';
    navigator.clipboard.writeText(`https://citadelbuy.com/ref/${referralCode}`);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handleCreateReferral = async () => {
    if (referralEmail.trim()) {
      await createReferral(referralEmail.trim());
      setReferralEmail('');
    }
  };

  if (isLoading && !account) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const tier = account?.tier || 'BRONZE';
  const tierInfo = tierConfig[tier];
  const TierIcon = tierInfo.icon;
  const nextTierPoints = account?.nextTierPoints;
  const progress = nextTierPoints
    ? Math.min((account!.points / nextTierPoints) * 100, 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header with Tier Status */}
      <div
        className={`bg-gradient-to-r ${tierInfo.color} rounded-lg shadow-sm p-6 text-white`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <TierIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tier} Member</h1>
              <p className="opacity-90">
                {account?.points.toLocaleString() || 0} points available
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Lifetime Points</p>
            <p className="text-2xl font-bold">
              {account?.lifetimePoints?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {nextTierPoints && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>{account?.points.toLocaleString()} pts</span>
              <span>{nextTierPoints.toLocaleString()} pts (next tier)</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm mt-2 opacity-90">
              {(nextTierPoints - (account?.points || 0)).toLocaleString()} points to next
              tier
            </p>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Award },
            { id: 'rewards', label: 'Rewards', icon: Gift },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'referrals', label: 'Referrals', icon: Users },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Your Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {tierInfo.benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* How to Earn */}
          <Card>
            <CardHeader>
              <CardTitle>Ways to Earn Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { action: 'Make a purchase', points: '1 point per $1' },
                  { action: 'Write a review', points: '50 points' },
                  { action: 'Refer a friend', points: '500 points' },
                  { action: 'Birthday bonus', points: 'Up to 300 points' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                  >
                    <span className="font-medium text-gray-900">{item.action}</span>
                    <Badge variant="secondary">{item.points}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Tier Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(tierConfig).map(([tierName, config]) => {
                  const isCurrent = tierName === tier;
                  const thresholds = {
                    BRONZE: 0,
                    SILVER: 1000,
                    GOLD: 5000,
                    PLATINUM: 15000,
                  };

                  return (
                    <div
                      key={tierName}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        isCurrent ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center`}
                          >
                            <config.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{tierName}</p>
                            <p className="text-sm text-gray-500">
                              {thresholds[tierName as keyof typeof thresholds].toLocaleString()}{' '}
                              points required
                            </p>
                          </div>
                        </div>
                        {isCurrent && (
                          <Badge className="bg-primary">Current Tier</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No rewards available right now</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {reward.imageUrl && (
                        <img
                          src={reward.imageUrl}
                          alt={reward.name}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {reward.description}
                        </p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="font-bold text-primary">
                            {reward.pointsCost.toLocaleString()} pts
                          </span>
                          <Button
                            size="sm"
                            disabled={
                              (account?.points || 0) < reward.pointsCost ||
                              isLoading
                            }
                            onClick={() => redeemReward(reward.id)}
                          >
                            Redeem
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Redemptions */}
          {redemptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>My Redemptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {redemptions.map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {redemption.reward.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {redemption.code && `Code: ${redemption.code}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            redemption.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : redemption.status === 'USED'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {redemption.status}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          Expires {new Date(redemption.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Points History</CardTitle>
          </CardHeader>
          <CardContent>
            {account?.history && account.history.length > 0 ? (
              <div className="space-y-4">
                {account.history.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
                        transaction.type === 'EARNED'
                          ? 'text-green-600'
                          : transaction.type === 'REDEEMED'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {transaction.type === 'EARNED' ? '+' : '-'}
                      {Math.abs(transaction.points).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Refer Friends & Earn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Get 500 points for every friend!
                    </h3>
                    <p className="text-gray-600">
                      Your friend also gets 10% off their first order
                    </p>
                  </div>
                </div>
              </div>

              {/* Share Link */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Referral Link
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`https://citadelbuy.com/ref/${referrals[0]?.code || 'YOUR_CODE'}`}
                    className="font-mono"
                  />
                  <Button onClick={handleCopyReferral}>
                    {copiedReferral ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Invite by Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite by Email
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="friend@email.com"
                    value={referralEmail}
                    onChange={(e) => setReferralEmail(e.target.value)}
                  />
                  <Button onClick={handleCreateReferral}>Send Invite</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral History */}
          {referrals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {referral.referredEmail}
                        </p>
                        <p className="text-sm text-gray-500">
                          Invited {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            referral.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : referral.status === 'REGISTERED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {referral.status}
                        </Badge>
                        {referral.pointsEarned && (
                          <p className="text-sm text-green-600 mt-1">
                            +{referral.pointsEarned} pts
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
