'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRedeemGiftCard, useCheckGiftCardBalance } from '@/lib/api/gift-cards';
import { Gift, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RedeemWidgetProps {
  orderId?: string;
  orderTotal?: number;
  onRedemptionSuccess?: (amount: number, remainingBalance: number) => void;
}

export function RedeemWidget({
  orderId,
  orderTotal,
  onRedemptionSuccess,
}: RedeemWidgetProps) {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [checkedBalance, setCheckedBalance] = useState<{
    balance: number;
    status: string;
  } | null>(null);

  const checkBalance = useCheckGiftCardBalance();
  const redeemGiftCard = useRedeemGiftCard();

  const handleCheckBalance = () => {
    if (!code.trim()) return;

    checkBalance.mutate(
      { code: code.trim() },
      {
        onSuccess: (data) => {
          setCheckedBalance({ balance: data.balance, status: data.status });
        },
      },
    );
  };

  const handleRedeem = () => {
    if (!code.trim()) return;

    const redemptionData = {
      code: code.trim(),
      orderId,
      amount: amount ? parseFloat(amount) : undefined,
    };

    redeemGiftCard.mutate(redemptionData, {
      onSuccess: (data) => {
        if (onRedemptionSuccess) {
          onRedemptionSuccess(data.redemptionAmount, data.remainingBalance);
        }
        // Reset form
        setCode('');
        setAmount('');
        setCheckedBalance(null);
      },
    });
  };

  const isRedeemDisabled =
    !code.trim() ||
    redeemGiftCard.isPending ||
    (!!amount && (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Apply Gift Card
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gift Card Code Input */}
        <div className="space-y-2">
          <Label htmlFor="giftCardCode">Gift Card Code</Label>
          <div className="flex gap-2">
            <Input
              id="giftCardCode"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCheckedBalance(null); // Reset balance when code changes
              }}
              className="font-mono"
              maxLength={19}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCheckBalance}
              disabled={!code.trim() || checkBalance.isPending}
            >
              Check
            </Button>
          </div>
        </div>

        {/* Balance Display */}
        {checkedBalance && (
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="ml-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  Available Balance:
                </span>
                <span className="text-lg font-bold text-blue-700">
                  ${checkedBalance.balance.toFixed(2)}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Partial Redemption */}
        {checkedBalance && checkedBalance.balance > 0 && (
          <div className="space-y-2">
            <Label htmlFor="amount">
              Redemption Amount (Optional - leave blank to use full balance)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={checkedBalance.balance}
              placeholder={`Up to $${checkedBalance.balance.toFixed(2)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {orderTotal && (
                <>Order total: ${orderTotal.toFixed(2)}</>
              )}
            </p>
          </div>
        )}

        {/* Error Display */}
        {checkBalance.isError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {checkBalance.error instanceof Error
                ? checkBalance.error.message
                : 'Invalid gift card code or card is not active.'}
            </AlertDescription>
          </Alert>
        )}

        {redeemGiftCard.isError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {redeemGiftCard.error instanceof Error
                ? redeemGiftCard.error.message
                : 'Failed to redeem gift card. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {redeemGiftCard.isSuccess && redeemGiftCard.data && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2">
              <div className="space-y-1 text-green-900">
                <p className="font-medium">Gift card applied successfully!</p>
                <div className="flex items-center justify-between text-sm">
                  <span>Applied:</span>
                  <span className="font-bold">
                    ${redeemGiftCard.data.redemptionAmount.toFixed(2)}
                  </span>
                </div>
                {redeemGiftCard.data.remainingBalance > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Remaining Balance:</span>
                    <span className="font-bold">
                      ${redeemGiftCard.data.remainingBalance.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Apply Button */}
        <Button
          type="button"
          className="w-full"
          onClick={handleRedeem}
          disabled={isRedeemDisabled}
        >
          {redeemGiftCard.isPending ? (
            'Applying...'
          ) : (
            <>
              <Gift className="h-4 w-4 mr-2" />
              Apply Gift Card
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Gift cards can be applied to your order at checkout
        </p>
      </CardContent>
    </Card>
  );
}
