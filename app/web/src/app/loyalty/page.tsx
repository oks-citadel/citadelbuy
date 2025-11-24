'use client';

import { useState } from 'react';
import {
  useMyLoyaltyAccount,
  usePointHistory,
  useAvailableRewards,
  useTiers,
  useLoyaltyProgram,
  LoyaltyTier,
  type TierBenefit,
  type Reward,
  type PointTransaction,
} from '@/lib/api/loyalty';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from '@/components/loyalty/tier-badge';
import { PointsDisplay } from '@/components/loyalty/points-display';
import {
  Gift,
  TrendingUp,
  Users,
  History,
  Award,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function LoyaltyPage() {
  const { data: loyalty, isLoading: loyaltyLoading } = useMyLoyaltyAccount();
  const { data: pointHistory = [] } = usePointHistory(10);
  const { data: availableRewards = [] } = useAvailableRewards();
  const { data: tiers = [] } = useTiers();
  const { data: program } = useLoyaltyProgram();
  const [copiedCode, setCopiedCode] = useState(false);

  if (loyaltyLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!loyalty) {
    return <div className="container mx-auto p-6">Loyalty account not found</div>;
  }

  // Find next tier
  const tierOrder = [
    LoyaltyTier.BRONZE,
    LoyaltyTier.SILVER,
    LoyaltyTier.GOLD,
    LoyaltyTier.PLATINUM,
    LoyaltyTier.DIAMOND,
  ];
  const currentTierIndex = tierOrder.indexOf(loyalty.currentTier);
  const nextTier = currentTierIndex < tierOrder.length - 1 ? tierOrder[currentTierIndex + 1] : null;
  const nextTierBenefit = tiers.find((t: TierBenefit) => t.tier === nextTier);

  // Calculate progress to next tier
  const currentTierBenefit = tiers.find((t: TierBenefit) => t.tier === loyalty.currentTier);
  const progressToNextTier = nextTierBenefit
    ? ((loyalty.lifetimeSpending - (currentTierBenefit?.minimumSpending || 0)) /
        (nextTierBenefit.minimumSpending - (currentTierBenefit?.minimumSpending || 0))) *
      100
    : 100;

  // Get affordable rewards
  const affordableRewards = availableRewards.filter((r: Reward) => r.canAfford);

  const copyReferralCode = () => {
    navigator.clipboard.writeText(loyalty.referralCode);
    setCopiedCode(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Loyalty Rewards</h1>
        <p className="text-muted-foreground">
          Earn points on every purchase and unlock exclusive benefits
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Points</CardTitle>
          </CardHeader>
          <CardContent>
            <PointsDisplay points={loyalty.currentPoints} label="Available" size="lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lifetime Points</CardTitle>
          </CardHeader>
          <CardContent>
            <PointsDisplay
              points={loyalty.lifetimePoints}
              label="Total Earned"
              size="lg"
              showIcon={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <TierBadge tier={loyalty.currentTier} size="lg" />
            <p className="mt-2 text-xs text-muted-foreground">
              Member since {new Date(loyalty.tierSince).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lifetime Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${loyalty.lifetimeSpending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      {nextTier && nextTierBenefit && (
        <Card>
          <CardHeader>
            <CardTitle>Progress to {nextTierBenefit.name}</CardTitle>
            <CardDescription>
              Spend ${(nextTierBenefit.minimumSpending - loyalty.lifetimeSpending).toFixed(2)} more
              to unlock {nextTierBenefit.name} benefits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <TierBadge tier={loyalty.currentTier} size="sm" />
                <TierBadge tier={nextTier} size="sm" />
              </div>
              <Progress value={Math.min(progressToNextTier, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                ${loyalty.lifetimeSpending.toLocaleString()} / $
                {nextTierBenefit.minimumSpending.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rewards">
            <Gift className="mr-2 h-4 w-4" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="referral">
            <Users className="mr-2 h-4 w-4" />
            Referral Program
          </TabsTrigger>
          <TabsTrigger value="benefits">
            <Award className="mr-2 h-4 w-4" />
            Tier Benefits
          </TabsTrigger>
        </TabsList>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Rewards</CardTitle>
              <CardDescription>
                You can afford {affordableRewards.length} of {availableRewards.length} rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableRewards.slice(0, 6).map((reward: Reward) => (
                  <Card key={reward.id} className={!reward.canAfford ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{reward.name}</CardTitle>
                        {reward.canAfford && (
                          <Badge variant="default" className="bg-green-500">
                            Can Redeem
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {reward.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-lg font-bold">
                          <Sparkles className="h-4 w-4 text-yellow-500" />
                          {reward.pointsCost.toLocaleString()}
                        </div>
                        <Button size="sm" disabled={!reward.canAfford} asChild>
                          <Link href={`/loyalty/rewards/${reward.id}`}>Redeem</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {availableRewards.length > 6 && (
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link href="/loyalty/rewards">
                    View All Rewards <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Ways to Earn */}
          <Card>
            <CardHeader>
              <CardTitle>Ways to Earn Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Make Purchases</p>
                    <p className="text-sm text-muted-foreground">
                      Earn {program?.pointsPerDollar || 1} point per $1 spent
                      {currentTierBenefit &&
                        currentTierBenefit.pointsMultiplier > 1 &&
                        ` (${currentTierBenefit.pointsMultiplier}x bonus!)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Write Reviews</p>
                    <p className="text-sm text-muted-foreground">
                      Earn {program?.reviewRewardPoints || 50} points per product review
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Refer Friends</p>
                    <p className="text-sm text-muted-foreground">
                      Earn {program?.referrerRewardPoints || 500} points per successful referral
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Birthday Bonus</p>
                    <p className="text-sm text-muted-foreground">
                      Get {program?.birthdayRewardPoints || 200} bonus points on your birthday
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Point History</CardTitle>
              <CardDescription>Your recent point transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pointHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground">No transactions yet</p>
                ) : (
                  pointHistory.map((transaction: PointTransaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.points > 0 ? '+' : ''}
                        {transaction.points.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {pointHistory.length > 0 && (
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link href="/loyalty/history">View Full History</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referral Tab */}
        <TabsContent value="referral">
          <Card>
            <CardHeader>
              <CardTitle>Refer Friends & Earn</CardTitle>
              <CardDescription>
                Share your referral code and earn {program?.referrerRewardPoints || 500} points for
                each friend who makes a purchase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-6">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Your Referral Code
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-background p-3 text-2xl font-bold tracking-wider">
                    {loyalty.referralCode}
                  </code>
                  <Button size="lg" onClick={copyReferralCode}>
                    {copiedCode ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    <p className="font-semibold">You Get</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {program?.referrerRewardPoints || 500} Points
                  </p>
                  <p className="text-sm text-muted-foreground">
                    When your friend makes their first purchase
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    <p className="font-semibold">They Get</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {program?.refereeRewardPoints || 250} Points
                  </p>
                  <p className="text-sm text-muted-foreground">
                    As a welcome bonus for joining
                  </p>
                </div>
              </div>

              <Button className="w-full" size="lg" asChild>
                <Link href="/loyalty/referrals">View My Referrals</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefits Tab */}
        <TabsContent value="benefits">
          <div className="grid gap-4">
            {tiers.map((tier: TierBenefit) => (
              <Card
                key={tier.tier}
                className={tier.tier === loyalty.currentTier ? 'border-primary' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TierBadge tier={tier.tier} />
                      <div>
                        <CardTitle>{tier.name}</CardTitle>
                        <CardDescription>{tier.description}</CardDescription>
                      </div>
                    </div>
                    {tier.tier === loyalty.currentTier && (
                      <Badge variant="default">Current Tier</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Points Multiplier</p>
                      <p className="text-lg font-bold">{tier.pointsMultiplier}x</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Discount</p>
                      <p className="text-lg font-bold">{tier.discountPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Free Shipping</p>
                      <p className="text-lg font-bold">{tier.freeShipping ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Early Access</p>
                      <p className="text-lg font-bold">
                        {tier.earlyAccessHours > 0 ? `${tier.earlyAccessHours}h` : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Priority Support</p>
                      <p className="text-lg font-bold">{tier.prioritySupport ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Exclusive Products</p>
                      <p className="text-lg font-bold">{tier.exclusiveProducts ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Requires ${tier.minimumSpending.toLocaleString()} lifetime spending and{' '}
                      {tier.minimumPoints.toLocaleString()} lifetime points
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
