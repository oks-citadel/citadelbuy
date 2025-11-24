'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Truck, Package, DollarSign, CreditCard } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import type { ReturnRequest } from '@/lib/api/returns';

export default function AdminReturnDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();

  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [itemInspections, setItemInspections] = useState<Record<string, {
    inspectionStatus: string;
    condition: string;
    notes: string;
    adjustedRefundAmount: number;
  }>>({});

  // Dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/admin/returns');
      return;
    }

    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchReturnDetails();
  }, [isAuthenticated, user, id, router]);

  const fetchReturnDetails = async () => {
    try {
      setIsLoading(true);
      const { returnsApi } = await import('@/lib/api/returns');
      const data = await returnsApi.getById(id);
      setReturnRequest(data);
      setApprovedAmount(data.totalAmount);

      // Initialize inspection states
      const inspections: typeof itemInspections = {};
      data.items.forEach((item) => {
        inspections[item.id] = {
          inspectionStatus: item.inspectionStatus || 'APPROVED',
          condition: item.condition || 'GOOD',
          notes: item.notes || '',
          adjustedRefundAmount: item.refundAmount,
        };
      });
      setItemInspections(inspections);
    } catch (err: any) {
      console.error('Failed to fetch return details:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to load return details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!returnRequest) return;

    setIsProcessing(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      await returnsApi.approve(id, {
        approvedAmount: approvedAmount || returnRequest.totalAmount,
        resolutionNotes: approvalNotes,
      });
      toast({
        title: 'Return Approved',
        description: 'The return has been approved successfully',
      });
      setShowApprovalDialog(false);
      fetchReturnDetails();
    } catch (err: any) {
      console.error('Failed to approve return:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to approve return',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!returnRequest || !rejectionNotes) {
      toast({
        title: 'Validation Error',
        description: 'Please provide rejection notes',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      await returnsApi.reject(id, { resolutionNotes: rejectionNotes });
      toast({
        title: 'Return Rejected',
        description: 'The return has been rejected',
      });
      setShowRejectionDialog(false);
      fetchReturnDetails();
    } catch (err: any) {
      console.error('Failed to reject return:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to reject return',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateLabel = async () => {
    if (!returnRequest) return;

    setIsProcessing(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      await returnsApi.generateLabel(id);
      toast({
        title: 'Label Generated',
        description: 'Return shipping label has been generated and sent to customer',
      });
      fetchReturnDetails();
    } catch (err: any) {
      console.error('Failed to generate label:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to generate label',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!returnRequest) return;

    setIsProcessing(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      await returnsApi.markReceived(id);
      toast({
        title: 'Return Received',
        description: 'Return has been marked as received',
      });
      fetchReturnDetails();
    } catch (err: any) {
      console.error('Failed to mark as received:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to mark as received',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInspect = async () => {
    if (!returnRequest) return;

    setIsProcessing(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      const items = Object.entries(itemInspections).map(([returnItemId, data]) => ({
        returnItemId,
        inspectionStatus: data.inspectionStatus as any,
        condition: data.condition,
        notes: data.notes,
        adjustedRefundAmount: data.adjustedRefundAmount,
      }));

      await returnsApi.inspect(id, {
        items,
        inspectionNotes,
      });

      toast({
        title: 'Inspection Complete',
        description: 'Items have been inspected successfully',
      });
      setShowInspectionDialog(false);
      fetchReturnDetails();
    } catch (err: any) {
      console.error('Failed to inspect return:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to inspect return',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!returnRequest?.refund) return;

    setIsProcessing(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      await returnsApi.processRefund(returnRequest.refund.id);
      toast({
        title: 'Refund Processed',
        description: 'Refund has been processed successfully',
      });
      fetchReturnDetails();
    } catch (err: any) {
      console.error('Failed to process refund:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to process refund',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIssueStoreCredit = async () => {
    if (!returnRequest?.refund) return;

    setIsProcessing(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');
      await returnsApi.issueStoreCredit(returnRequest.refund.id);
      toast({
        title: 'Store Credit Issued',
        description: 'Store credit has been issued to customer',
      });
      fetchReturnDetails();
    } catch (err: any) {
      console.error('Failed to issue store credit:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to issue store credit',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED':
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'LABEL_GENERATED':
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800';
      case 'RECEIVED':
      case 'INSPECTING':
        return 'bg-indigo-100 text-indigo-800';
      case 'REFUND_PENDING':
      case 'REFUND_PROCESSING':
        return 'bg-orange-100 text-orange-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
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
          <Link href="/admin/returns">
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
        <Link href="/admin/returns">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Returns
          </Button>
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">RMA #{returnRequest.rmaNumber}</h1>
            <p className="mt-2 text-muted-foreground">
              Order #{returnRequest.orderId} • Created {new Date(returnRequest.createdAt).toLocaleDateString()}
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
          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {returnRequest.status === 'PENDING_APPROVAL' && (
                  <>
                    <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Return
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve Return</DialogTitle>
                          <DialogDescription>
                            Approve this return request and notify the customer
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Approved Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={approvedAmount || ''}
                              onChange={(e) => setApprovedAmount(parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Notes (Optional)</Label>
                            <Textarea
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              placeholder="Any notes for the customer..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleApprove} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Approve
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Return
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Return</DialogTitle>
                          <DialogDescription>
                            Reject this return request with a reason
                          </DialogDescription>
                        </DialogHeader>
                        <div>
                          <Label>Rejection Reason *</Label>
                          <Textarea
                            value={rejectionNotes}
                            onChange={(e) => setRejectionNotes(e.target.value)}
                            placeholder="Explain why this return is being rejected..."
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectionNotes}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reject
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}

                {returnRequest.status === 'APPROVED' && !returnRequest.returnLabel && (
                  <Button onClick={handleGenerateLabel} disabled={isProcessing} className="w-full">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                    Generate Shipping Label
                  </Button>
                )}

                {returnRequest.status === 'IN_TRANSIT' && (
                  <Button onClick={handleMarkReceived} disabled={isProcessing} className="w-full">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                    Mark as Received
                  </Button>
                )}

                {(returnRequest.status === 'RECEIVED' || returnRequest.status === 'INSPECTING') && (
                  <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Inspect Items
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Inspect Returned Items</DialogTitle>
                        <DialogDescription>
                          Review each item and update inspection status
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {returnRequest.items.map((item) => (
                          <Card key={item.id}>
                            <CardContent className="pt-4">
                              <div className="flex gap-4">
                                <div className="relative h-16 w-16 flex-shrink-0">
                                  <Image
                                    src={item.product.imageUrl || '/placeholder.png'}
                                    alt={item.product.name}
                                    fill
                                    className="rounded object-cover"
                                  />
                                </div>
                                <div className="flex-1 space-y-3">
                                  <h4 className="font-semibold">{item.product.name}</h4>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <Label className="text-xs">Inspection Status</Label>
                                      <Select
                                        value={itemInspections[item.id]?.inspectionStatus}
                                        onValueChange={(value) =>
                                          setItemInspections({
                                            ...itemInspections,
                                            [item.id]: { ...itemInspections[item.id], inspectionStatus: value },
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="APPROVED">Approved</SelectItem>
                                          <SelectItem value="REJECTED">Rejected</SelectItem>
                                          <SelectItem value="RESTOCKING_FEE">Restocking Fee</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Refund Amount</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8"
                                        value={itemInspections[item.id]?.adjustedRefundAmount}
                                        onChange={(e) =>
                                          setItemInspections({
                                            ...itemInspections,
                                            [item.id]: {
                                              ...itemInspections[item.id],
                                              adjustedRefundAmount: parseFloat(e.target.value),
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Notes</Label>
                                    <Textarea
                                      className="h-16 text-sm"
                                      value={itemInspections[item.id]?.notes}
                                      onChange={(e) =>
                                        setItemInspections({
                                          ...itemInspections,
                                          [item.id]: { ...itemInspections[item.id], notes: e.target.value },
                                        })
                                      }
                                      placeholder="Inspection notes..."
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <div>
                          <Label>General Inspection Notes</Label>
                          <Textarea
                            value={inspectionNotes}
                            onChange={(e) => setInspectionNotes(e.target.value)}
                            placeholder="Overall inspection notes..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInspectionDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInspect} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Complete Inspection
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {returnRequest.refund && returnRequest.refund.status === 'PENDING' && (
                  <>
                    {returnRequest.returnType !== 'STORE_CREDIT' && (
                      <Button onClick={handleProcessRefund} disabled={isProcessing} className="w-full">
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                        Process Refund
                      </Button>
                    )}
                    {returnRequest.returnType === 'STORE_CREDIT' && (
                      <Button onClick={handleIssueStoreCredit} disabled={isProcessing} className="w-full">
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Issue Store Credit
                      </Button>
                    )}
                  </>
                )}
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
                        <p className="mt-2 text-sm font-medium">
                          Inspection: {item.inspectionStatus.split('_').join(' ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer ID:</span>
                <span className="font-mono text-xs">{returnRequest.userId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Type:</span>
                <span className="font-medium">{returnRequest.returnType.split('_').join(' ')}</span>
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

          {/* Shipping */}
          {returnRequest.returnLabel && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping</CardTitle>
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
              </CardContent>
            </Card>
          )}

          {/* Refund */}
          {returnRequest.refund && (
            <Card>
              <CardHeader>
                <CardTitle>Refund</CardTitle>
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
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">${returnRequest.refund.totalAmount.toFixed(2)}</span>
                </div>
                {returnRequest.refund.transactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-xs">{returnRequest.refund.transactionId}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
