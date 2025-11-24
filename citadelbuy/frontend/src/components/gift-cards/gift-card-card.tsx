'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GiftCard, GiftCardStatus, GiftCardType } from '@/lib/api/gift-cards';
import { cn } from '@/lib/utils';
import { Gift, Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface GiftCardCardProps {
  giftCard: GiftCard;
  showDetails?: boolean;
  className?: string;
}

export function GiftCardCard({
  giftCard,
  showDetails = true,
  className,
}: GiftCardCardProps) {
  const statusConfig = {
    [GiftCardStatus.ACTIVE]: {
      label: 'Active',
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-800 border-green-300',
    },
    [GiftCardStatus.REDEEMED]: {
      label: 'Redeemed',
      icon: CheckCircle2,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
    },
    [GiftCardStatus.EXPIRED]: {
      label: 'Expired',
      icon: Clock,
      color: 'bg-red-100 text-red-800 border-red-300',
    },
    [GiftCardStatus.CANCELLED]: {
      label: 'Cancelled',
      icon: XCircle,
      color: 'bg-red-100 text-red-800 border-red-300',
    },
    [GiftCardStatus.SUSPENDED]: {
      label: 'Suspended',
      icon: AlertCircle,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
  };

  const typeConfig = {
    [GiftCardType.DIGITAL]: { label: 'Digital', color: 'bg-blue-100 text-blue-800' },
    [GiftCardType.PHYSICAL]: { label: 'Physical', color: 'bg-purple-100 text-purple-800' },
    [GiftCardType.PROMOTIONAL]: { label: 'Promotional', color: 'bg-pink-100 text-pink-800' },
  };

  const status = statusConfig[giftCard.status];
  const type = typeConfig[giftCard.type];
  const StatusIcon = status.icon;

  const balancePercentage = (giftCard.currentBalance / giftCard.initialAmount) * 100;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-md',
        giftCard.status !== GiftCardStatus.ACTIVE && 'opacity-75',
        className,
      )}
    >
      {/* Gift Card Visual */}
      <div
        className={cn(
          'relative h-32 bg-gradient-to-br p-6 text-white',
          giftCard.type === GiftCardType.PROMOTIONAL
            ? 'from-pink-500 to-purple-600'
            : 'from-blue-500 to-indigo-600',
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <span className="text-sm font-medium">Gift Card</span>
            </div>
            <div className="text-2xl font-bold">
              ${giftCard.currentBalance.toFixed(2)}
            </div>
            {giftCard.currentBalance !== giftCard.initialAmount && (
              <div className="text-xs opacity-80">
                of ${giftCard.initialAmount.toFixed(2)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={type.color}>{type.label}</Badge>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Balance Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${balancePercentage}%` }}
          />
        </div>
      </div>

      {showDetails && (
        <CardContent className="p-4 space-y-3">
          {/* Code */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gift Card Code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm">
                {giftCard.code}
              </code>
            </div>
          </div>

          {/* Recipient */}
          {giftCard.recipientEmail && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Recipient</p>
              <p className="text-sm">
                {giftCard.recipientName || giftCard.recipientEmail}
              </p>
            </div>
          )}

          {/* Sender */}
          {giftCard.senderName && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">From</p>
              <p className="text-sm">{giftCard.senderName}</p>
            </div>
          )}

          {/* Message */}
          {giftCard.personalMessage && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Message</p>
              <p className="text-sm italic">{giftCard.personalMessage}</p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
            <div>
              <p className="text-muted-foreground">Purchase Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(giftCard.purchaseDate), 'MMM d, yyyy')}
              </p>
            </div>
            {giftCard.expirationDate && (
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(giftCard.expirationDate), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          {giftCard.usageCount > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Used {giftCard.usageCount} {giftCard.usageCount === 1 ? 'time' : 'times'}
                {giftCard.lastUsedAt && (
                  <span className="ml-1">
                    • Last used {format(new Date(giftCard.lastUsedAt), 'MMM d, yyyy')}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Scheduled Delivery */}
          {giftCard.isScheduled && !giftCard.deliveredAt && giftCard.scheduledDelivery && (
            <div className="pt-2 border-t">
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Scheduled for {format(new Date(giftCard.scheduledDelivery), 'MMM d, yyyy')}
              </Badge>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
