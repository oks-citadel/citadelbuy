'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCheckGiftCardBalance, GiftCardStatus } from '@/lib/api/gift-cards';
import { Search, CreditCard, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GiftCardBalance() {
  const [code, setCode] = useState('');
  const checkBalance = useCheckGiftCardBalance();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    checkBalance.mutate({ code: code.trim() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Check Gift Card Balance
        </CardTitle>
        <CardDescription>
          Enter your gift card code to check the remaining balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Gift Card Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono"
                maxLength={19} // 16 chars + 3 hyphens
              />
              <Button
                type="submit"
                disabled={checkBalance.isPending || !code.trim()}
              >
                <Search className="h-4 w-4 mr-2" />
                Check
              </Button>
            </div>
          </div>

          {checkBalance.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {checkBalance.error instanceof Error
                  ? checkBalance.error.message
                  : 'Failed to check gift card balance. Please verify the code and try again.'}
              </AlertDescription>
            </Alert>
          )}

          {checkBalance.isSuccess && checkBalance.data && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-900">Balance:</span>
                    <span className="text-2xl font-bold text-green-700">
                      ${checkBalance.data.balance.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-800">Status:</span>
                    <Badge
                      variant={
                        checkBalance.data.status === GiftCardStatus.ACTIVE
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {checkBalance.data.status}
                    </Badge>
                  </div>

                  {checkBalance.data.expirationDate && (
                    <div className="text-xs text-green-800 pt-2 border-t border-green-200">
                      Expires: {new Date(checkBalance.data.expirationDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
