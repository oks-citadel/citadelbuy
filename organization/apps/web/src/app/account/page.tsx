'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useOrdersStore, useLoyaltyStore, useWishlistStore } from '@/stores/account-store';
import {
  ShoppingBag,
  Heart,
  Award,
  Package,
  TrendingUp,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AccountDashboard() {
  const { user } = useAuthStore();
  const { orders, fetchOrders } = useOrdersStore();
  const { account, fetchAccount } = useLoyaltyStore();
  const { count: wishlistCount, fetchWishlist } = useWishlistStore();

  useEffect(() => {
    fetchOrders();
    fetchAccount();
    fetchWishlist();
  }, [fetchOrders, fetchAccount, fetchWishlist]);

  const recentOrders = orders.slice(0, 3);
  const pendingOrders = orders.filter(
    (o) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)
  ).length;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return 'bg-gradient-to-r from-gray-700 to-gray-900 text-white';
      case 'GOLD':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      case 'SILVER':
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      default:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s what&apos;s happening with your account today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Wishlist Items</p>
                <p className="text-2xl font-bold text-gray-900">{wishlistCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Loyalty Points</p>
                <p className="text-2xl font-bold text-gray-900">
                  {account?.points?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Status */}
      {account && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`px-4 py-2 rounded-lg font-semibold ${getTierColor(
                    account.tier
                  )}`}
                >
                  {account.tier} Member
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Points</p>
                  <p className="text-xl font-bold text-gray-900">
                    {account.points.toLocaleString()}
                  </p>
                </div>
              </div>
              {account.nextTierPoints && (
                <div className="flex-1 max-w-md">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{account.points.toLocaleString()} pts</span>
                    <span>{account.nextTierPoints.toLocaleString()} pts</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (account.points / account.nextTierPoints) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {account.nextTierPoints - account.points} points to next tier
                  </p>
                </div>
              )}
              <Link href="/account/loyalty">
                <Button variant="outline" size="sm">
                  View Rewards
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/account/orders">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No orders yet</p>
              <Link href="/products">
                <Button className="mt-4">Start Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      {order.items[0]?.product?.images?.[0]?.url ? (
                        <img
                          src={order.items[0].product.images[0].url}
                          alt=""
                          className="w-14 h-14 object-cover rounded"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''} •{' '}
                        ${order.total.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadge(order.status)}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/account/orders">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-gray-900">Track Orders</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/returns">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-gray-900">Start Return</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/gift-cards">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-gray-900">Gift Cards</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/support">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Award className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-gray-900">Get Help</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
