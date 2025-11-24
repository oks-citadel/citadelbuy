'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

interface ReturnItemForm {
  orderItemId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  itemPrice: number;
  maxQuantity: number;
  quantity: number;
  reason: string;
  condition: string;
  notes: string;
}

const RETURN_REASONS = [
  { value: 'DEFECTIVE', label: 'Defective or damaged' },
  { value: 'WRONG_ITEM', label: 'Wrong item received' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'SIZE_ISSUE', label: 'Size/fit issue' },
  { value: 'CHANGED_MIND', label: 'Changed mind' },
  { value: 'BETTER_PRICE', label: 'Found better price' },
  { value: 'QUALITY', label: 'Quality not as expected' },
  { value: 'OTHER', label: 'Other' },
];

const ITEM_CONDITIONS = [
  { value: 'UNOPENED', label: 'Unopened/New' },
  { value: 'OPENED_UNUSED', label: 'Opened but unused' },
  { value: 'USED_LIKE_NEW', label: 'Used - Like new' },
  { value: 'USED_GOOD', label: 'Used - Good condition' },
  { value: 'DAMAGED', label: 'Damaged' },
];

const RETURN_TYPES = [
  { value: 'REFUND', label: 'Refund to original payment' },
  { value: 'STORE_CREDIT', label: 'Store credit' },
  { value: 'EXCHANGE', label: 'Exchange for same item' },
];

export default function NewReturnPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([]);
  const [returnType, setReturnType] = useState<string>('REFUND');
  const [generalReason, setGeneralReason] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/returns/new');
      return;
    }

    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const { ordersApi } = await import('@/lib/api/orders');
        const ordersData = await ordersApi.getAll();

        // Filter orders that can be returned (delivered, within return window)
        const returnableOrders = ordersData.filter(
          (order: Order) => order.status === 'DELIVERED' || order.status === 'COMPLETED'
        );
        setOrders(returnableOrders);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, router]);

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
    // Initialize return items from order items
    const items: ReturnItemForm[] = order.items.map((item) => ({
      orderItemId: item.id,
      productId: item.product.id,
      productName: item.product.name,
      imageUrl: item.product.images[0] || '/placeholder.png',
      itemPrice: item.price,
      maxQuantity: item.quantity,
      quantity: 0,
      reason: '',
      condition: '',
      notes: '',
    }));
    setReturnItems(items);
    setStep(2);
  };

  const updateReturnItem = (index: number, field: keyof ReturnItemForm, value: any) => {
    const updatedItems = [...returnItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setReturnItems(updatedItems);
  };

  const toggleItemSelection = (index: number) => {
    const updatedItems = [...returnItems];
    if (updatedItems[index].quantity > 0) {
      updatedItems[index].quantity = 0;
    } else {
      updatedItems[index].quantity = 1;
    }
    setReturnItems(updatedItems);
  };

  const canProceedToStep3 = () => {
    const selectedItems = returnItems.filter((item) => item.quantity > 0);
    if (selectedItems.length === 0) return false;

    return selectedItems.every(
      (item) =>
        item.reason &&
        item.condition &&
        item.quantity > 0 &&
        item.quantity <= item.maxQuantity
    );
  };

  const handleSubmit = async () => {
    if (!selectedOrder) return;

    const selectedItems = returnItems.filter((item) => item.quantity > 0);
    if (selectedItems.length === 0) {
      alert('Please select at least one item to return');
      return;
    }

    setIsSubmitting(true);
    try {
      const { returnsApi } = await import('@/lib/api/returns');

      const returnData = {
        orderId: selectedOrder.id,
        returnType: returnType as 'REFUND' | 'EXCHANGE' | 'STORE_CREDIT' | 'PARTIAL_REFUND',
        reason: generalReason,
        comments,
        items: selectedItems.map((item) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          quantity: item.quantity,
          reason: item.reason,
          condition: item.condition,
          notes: item.notes,
          itemPrice: item.itemPrice,
        })),
      };

      const result = await returnsApi.create(returnData);

      alert(`Return request (RMA ${result.rmaNumber}) submitted successfully`);
      router.push('/returns');
    } catch (error: any) {
      console.error('Failed to submit return request:', error);
      alert(error.response?.data?.message || 'Failed to submit return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalRefund = () => {
    return returnItems
      .filter((item) => item.quantity > 0)
      .reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.push('/returns')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Returns
        </Button>
        <h1 className="mt-4 text-3xl font-bold">Create Return Request</h1>
        <p className="mt-2 text-muted-foreground">
          Step {step} of 3: {step === 1 ? 'Select Order' : step === 2 ? 'Select Items' : 'Review & Submit'}
        </p>
      </div>

      {/* Step 1: Select Order */}
      {step === 1 && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  No eligible orders for returns. Orders must be delivered to be returnable.
                </p>
                <Button className="mt-4" onClick={() => router.push('/orders')}>
                  View All Orders
                </Button>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer transition-all hover:border-primary"
                onClick={() => handleOrderSelect(order)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Order #{order.id.substring(0, 8)}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Total:</strong> ${order.total.toFixed(2)}
                    </p>
                    <p className="text-sm">
                      <strong>Items:</strong> {order.items.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Step 2: Select Items & Provide Details */}
      {step === 2 && selectedOrder && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order #{selectedOrder.id.substring(0, 8)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Select the items you want to return and provide details
              </p>
            </CardContent>
          </Card>

          {returnItems.map((item, index) => (
            <Card key={item.orderItemId}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{item.productName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Price: ${item.itemPrice.toFixed(2)} × {item.maxQuantity}
                        </p>
                      </div>
                      <Button
                        variant={item.quantity > 0 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleItemSelection(index)}
                      >
                        {item.quantity > 0 ? 'Selected' : 'Select'}
                      </Button>
                    </div>

                    {item.quantity > 0 && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min={1}
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={(e) =>
                              updateReturnItem(index, 'quantity', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label>Reason</Label>
                          <Select
                            value={item.reason}
                            onValueChange={(value) => updateReturnItem(index, 'reason', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {RETURN_REASONS.map((reason) => (
                                <SelectItem key={reason.value} value={reason.value}>
                                  {reason.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Condition</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(value) => updateReturnItem(index, 'condition', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              {ITEM_CONDITIONS.map((condition) => (
                                <SelectItem key={condition.value} value={condition.value}>
                                  {condition.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Additional Notes (Optional)</Label>
                          <Textarea
                            placeholder="Provide any additional details..."
                            value={item.notes}
                            onChange={(e) => updateReturnItem(index, 'notes', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!canProceedToStep3()}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && selectedOrder && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Return Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Return Type</Label>
                <Select value={returnType} onValueChange={setReturnType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>General Reason</Label>
                <Select value={generalReason} onValueChange={setGeneralReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select overall reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Comments (Optional)</Label>
                <Textarea
                  placeholder="Any additional information about your return..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items to Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {returnItems
                  .filter((item) => item.quantity > 0)
                  .map((item) => (
                    <div key={item.orderItemId} className="flex items-center gap-4 border-b pb-4">
                      <div className="relative h-16 w-16 flex-shrink-0">
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          className="rounded object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.productName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ${item.itemPrice.toFixed(2)} = $
                          {(item.quantity * item.itemPrice).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reason: {RETURN_REASONS.find((r) => r.value === item.reason)?.label}
                        </p>
                      </div>
                    </div>
                  ))}

                <div className="flex justify-between border-t pt-4 font-bold">
                  <span>Expected Refund:</span>
                  <span>${calculateTotalRefund().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !generalReason}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Return Request
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
