'use client';

import { useEffect, useState } from 'react';
import { vendorService } from '@/services/vendorService';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  total: number;
  items: OrderItem[];
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
}

export default function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const statuses = [
    { value: '', label: 'All Orders' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const statusColors: { [key: string]: string } = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    SHIPPED: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    loadOrders();
  }, [selectedStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getOrders(50, 0, selectedStatus || undefined);
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await vendorService.updateOrderStatus(orderId, newStatus);
      loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <div className="p-8">Loading orders...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-600 mt-1">Manage and fulfill customer orders</p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by status:</label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                  <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.customerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Items</p>
                  <p className="font-medium">{order.items?.length || 0} item(s)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-medium text-lg">${order.total.toFixed(2)}</p>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t pt-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Order Items:</p>
                <div className="space-y-2">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.productName} x {item.quantity}
                      </span>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update */}
              {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Order Status:
                  </label>
                  <div className="flex space-x-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'PROCESSING')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Mark as Processing
                      </button>
                    )}
                    {order.status === 'PROCESSING' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'SHIPPED')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {order.status === 'SHIPPED' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">Order Details</h2>
                <p className="text-gray-600">#{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <p className="text-sm"><strong>Name:</strong> {selectedOrder.customerName}</p>
                  <p className="text-sm"><strong>Email:</strong> {selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <p className="text-sm"><strong>Status:</strong> {selectedOrder.status}</p>
                  <p className="text-sm"><strong>Date:</strong> {formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <p className="text-sm text-gray-700">{selectedOrder.shippingAddress || 'N/A'}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Order Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Product</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Quantity</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Price</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm">{item.productName}</td>
                          <td className="px-4 py-3 text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm">${item.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold">
                          ${selectedOrder.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
