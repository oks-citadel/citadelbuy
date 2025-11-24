'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import type { ReturnRequest } from '@/lib/api/returns';

export default function ReturnDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated } = useAuthStore();

  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/returns');
      return;
    }

    fetchReturnDetails();
  }, [isAuthenticated, id, router]);

  const fetchReturnDetails = async () => {
    try {
      setIsLoading(true);
      const { returnsApi } = await import('@/lib/api/returns');
      const data = await returnsApi.getById(id);
      setReturnRequest(data);
    } catch (err: any) {
      console.error('Failed to fetch return details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReturn = async () => {
    if (!returnRequest) return;

    if (!confirm('Are you sure you want to cancel this return request?')) {
      return;
    }

    setIsCancelling(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      await returnsApi.cancel(id);
      alert('Return request cancelled successfully');
      fetchReturnDetails(); // Refresh data
    } catch (err: any) {
      console.error('Failed to cancel return:', err);
      alert(err.response?.data?.message || 'Failed to cancel return');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED':
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'LABEL_GENERATED':
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'RECEIVED':
      case 'INSPECTING':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'REFUND_PENDING':
      case 'REFUND_PROCESSING':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getReturnTypeLabel = (type: string) => {
    switch (type) {
      case 'REFUND':
        return 'Refund to Original Payment';
      case 'EXCHANGE':
        return 'Exchange for Same Item';
      case 'STORE_CREDIT':
        return 'Store Credit';
      case 'PARTIAL_REFUND':
        return 'Partial Refund';
      default:
        return type;
    }
  };

  const canCancelReturn = (status: string) => {
    return ['REQUESTED', 'PENDING_APPROVAL', 'APPROVED'].includes(status);
  };

  const getTimelineSteps = (returnRequest: ReturnRequest) => {
    const steps = [
      {
        label: 'Requested',
        date: returnRequest.createdAt,
        completed: true,
        icon: Package,
      },
      {
        label: 'Approved',
        date: returnRequest.approvedAt,
        completed: !!returnRequest.approvedAt,
        icon: CheckCircle,
      },
      {
        label: 'Label Generated',
        date: returnRequest.returnLabel?.createdAt,
        completed: !!returnRequest.returnLabel,
        icon: Download,
      },
      {
        label: 'In Transit',
        date: undefined,
        completed: ['IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'COMPLETED'].includes(
          returnRequest.status
        ),
        icon: Truck,
      },
      {
        label: 'Received & Inspected',
        date: undefined,
        completed: ['RECEIVED', 'INSPECTING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'COMPLETED'].includes(
          returnRequest.status
        ),
        icon: Package,
      },
      {
        label: 'Refund Processed',
        date: returnRequest.refund?.processedAt,
        completed: returnRequest.status === 'COMPLETED' && !!returnRequest.refund?.processedAt,
        icon: CheckCircle,
      },
    ];

    return steps;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading return details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!returnRequest) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <h2 className="text-2xl font-bold">Return Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The return request you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/returns">
            <Button className="mt-4">Back to Returns</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/returns">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Returns
          </Button>
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">RMA #{returnRequest.rmaNumber}</h1>
            <p className="mt-2 text-muted-foreground">
              Created on {new Date(returnRequest.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(
              returnRequest.status
            )}`}
          >
            {getStatusLabel(returnRequest.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Return Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {getTimelineSteps(returnRequest).map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
                      {index < getTimelineSteps(returnRequest).length - 1 && (
                        <div
                          className={`absolute left-4 top-8 h-full w-0.5 ${
                            step.completed ? 'bg-primary' : 'bg-gray-200'
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                          step.completed
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(step.date).toLocaleDateString()} at{' '}
                            {new Date(step.date).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Returned Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {returnRequest.items.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                    <div className="relative h-20 w-20 flex-shrink-0">
                      <Image
                        src={item.product.imageUrl || '/placeholder.png'}
                        alt={item.product.name}
                        fill
                        className="rounded object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × ${item.itemPrice.toFixed(2)} = $
                        {item.refundAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reason: {item.reason.split('_').join(' ')}
                      </p>
                      {item.condition && (
                        <p className="text-sm text-muted-foreground">
                          Condition: {item.condition.split('_').join(' ')}
                        </p>
                      )}
                      {item.inspectionStatus && (
                        <p className="text-sm font-medium">
                          Inspection: {item.inspectionStatus.split('_').join(' ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(returnRequest.comments || returnRequest.inspectionNotes || returnRequest.resolutionNotes) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {returnRequest.comments && (
                  <div>
                    <h4 className="font-semibold">Your Comments:</h4>
                    <p className="text-sm text-muted-foreground">{returnRequest.comments}</p>
                  </div>
                )}
                {returnRequest.inspectionNotes && (
                  <div>
                    <h4 className="font-semibold">Inspection Notes:</h4>
                    <p className="text-sm text-muted-foreground">{returnRequest.inspectionNotes}</p>
                  </div>
                )}
                {returnRequest.resolutionNotes && (
                  <div>
                    <h4 className="font-semibold">Resolution Notes:</h4>
                    <p className="text-sm text-muted-foreground">{returnRequest.resolutionNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Return Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Type:</span>
                <span className="font-medium">{getReturnTypeLabel(returnRequest.returnType)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items:</span>
                <span className="font-medium">{returnRequest.items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${returnRequest.totalAmount.toFixed(2)}</span>
              </div>
              {returnRequest.restockingFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Restocking Fee:</span>
                  <span className="font-medium text-red-600">
                    -${returnRequest.restockingFee.toFixed(2)}
                  </span>
                </div>
              )}
              {returnRequest.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Return Shipping:</span>
                  <span className="font-medium text-red-600">
                    -${returnRequest.shippingCost.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Refund Amount:</span>
                <span className="text-green-600">
                  $
                  {(
                    returnRequest.totalAmount -
                    returnRequest.restockingFee -
                    returnRequest.shippingCost
                  ).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Label */}
          {returnRequest.returnLabel && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Carrier:</span>
                  <span className="font-medium">{returnRequest.returnLabel.carrier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tracking:</span>
                  <span className="font-mono font-medium">
                    {returnRequest.returnLabel.trackingNumber}
                  </span>
                </div>
                {returnRequest.returnLabel.labelUrl && (
                  <a
                    href={returnRequest.returnLabel.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download Label
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Refund Status */}
          {returnRequest.refund && (
            <Card>
              <CardHeader>
                <CardTitle>Refund Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={`font-medium ${
                      returnRequest.refund.status === 'COMPLETED'
                        ? 'text-green-600'
                        : returnRequest.refund.status === 'FAILED'
                        ? 'text-red-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {getStatusLabel(returnRequest.refund.status)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium">
                    {returnRequest.refund.method.split('_').join(' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">${returnRequest.refund.totalAmount.toFixed(2)}</span>
                </div>
                {returnRequest.refund.transactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-xs">{returnRequest.refund.transactionId}</span>
                  </div>
                )}
                {returnRequest.refund.processedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processed:</span>
                    <span className="font-medium">
                      {new Date(returnRequest.refund.processedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {returnRequest.refund.failedReason && (
                  <div className="rounded bg-red-50 p-3 text-sm text-red-800">
                    <strong>Failed:</strong> {returnRequest.refund.failedReason}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {canCancelReturn(returnRequest.status) && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleCancelReturn}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Return
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
