'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { usePurchaseGiftCard, GiftCardType } from '@/lib/api/gift-cards';
import { Gift, Calendar, Mail, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export function GiftCardPurchaseForm() {
  const router = useRouter();
  const purchaseGiftCard = usePurchaseGiftCard();

  const [amount, setAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState('');
  const [type, setType] = useState<GiftCardType>(GiftCardType.DIGITAL);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDelivery, setScheduledDelivery] = useState('');

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 5 && numValue <= 1000) {
      setAmount(numValue);
    } else {
      setAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount < 5 || amount > 1000) {
      return;
    }

    const data = {
      amount: Number(amount),
      type,
      recipientEmail,
      recipientName: recipientName || undefined,
      senderName: senderName || undefined,
      personalMessage: personalMessage || undefined,
      isScheduled: isScheduled || undefined,
      scheduledDelivery: isScheduled && scheduledDelivery ? scheduledDelivery : undefined,
    };

    try {
      await purchaseGiftCard.mutateAsync(data);
      router.push('/gift-cards?success=true');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isValid =
    amount &&
    amount >= 5 &&
    amount <= 1000 &&
    recipientEmail &&
    (!isScheduled || scheduledDelivery);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Purchase Gift Card
        </CardTitle>
        <CardDescription>
          Give the gift of choice with a CitadelBuy gift card
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Selection */}
          <div className="space-y-3">
            <Label>Select Amount</Label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {PRESET_AMOUNTS.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  type="button"
                  variant={amount === presetAmount ? 'default' : 'outline'}
                  onClick={() => handleAmountSelect(presetAmount)}
                >
                  ${presetAmount}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="customAmount" className="whitespace-nowrap">
                Custom Amount
              </Label>
              <Input
                id="customAmount"
                type="number"
                min="5"
                max="1000"
                step="0.01"
                placeholder="$5 - $1000"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {amount && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Selected amount:</p>
                <p className="text-2xl font-bold">${Number(amount).toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Gift Card Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Gift Card Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as GiftCardType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GiftCardType.DIGITAL}>
                  Digital (Email Delivery)
                </SelectItem>
                <SelectItem value={GiftCardType.PHYSICAL}>
                  Physical (Mailed)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipient Email */}
          <div className="space-y-2">
            <Label htmlFor="recipientEmail">
              Recipient Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="recipientEmail"
                type="email"
                required
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="recipientName"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sender Name */}
          <div className="space-y-2">
            <Label htmlFor="senderName">Your Name (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="senderName"
                placeholder="Your name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
            <Textarea
              id="personalMessage"
              placeholder="Add a personal message..."
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {personalMessage.length}/500 characters
            </p>
          </div>

          {/* Scheduled Delivery */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isScheduled"
                checked={isScheduled}
                onCheckedChange={(checked) => setIsScheduled(checked as boolean)}
              />
              <Label htmlFor="isScheduled" className="cursor-pointer">
                Schedule delivery for a specific date
              </Label>
            </div>

            {isScheduled && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="scheduledDelivery">Delivery Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduledDelivery"
                    type="date"
                    required={isScheduled}
                    value={scheduledDelivery}
                    onChange={(e) => setScheduledDelivery(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {purchaseGiftCard.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {purchaseGiftCard.error instanceof Error
                  ? purchaseGiftCard.error.message
                  : 'Failed to purchase gift card. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!isValid || purchaseGiftCard.isPending}
          >
            {purchaseGiftCard.isPending ? (
              'Processing...'
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Purchase Gift Card for ${amount ? Number(amount).toFixed(2) : '0.00'}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Gift cards are non-refundable and will be sent to the recipient&apos;s email address
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
