'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Search,
  Filter,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Flag,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Review {
  id: string;
  productName: string;
  productSku: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  helpful: number;
  notHelpful: number;
  createdAt: string;
  hasImages: boolean;
  isVerifiedPurchase: boolean;
  isFlagged: boolean;
}

const demoReviews: Review[] = [
  {
    id: '1',
    productName: 'Wireless Bluetooth Headphones',
    productSku: 'WBH-001',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    rating: 5,
    title: 'Excellent sound quality!',
    comment:
      'These headphones are amazing! The sound quality is crystal clear and the battery lasts all day. Highly recommend for anyone looking for quality wireless headphones.',
    status: 'APPROVED',
    helpful: 45,
    notHelpful: 2,
    createdAt: '2024-03-14',
    hasImages: true,
    isVerifiedPurchase: true,
    isFlagged: false,
  },
  {
    id: '2',
    productName: 'Smart Fitness Tracker Pro',
    productSku: 'SFT-002',
    customerName: 'Jane Smith',
    customerEmail: 'jane.smith@example.com',
    rating: 4,
    title: 'Great fitness tracker',
    comment:
      'Works well for tracking my daily activities. The heart rate monitor is accurate and the app is easy to use. Only downside is battery life could be better.',
    status: 'APPROVED',
    helpful: 28,
    notHelpful: 5,
    createdAt: '2024-03-13',
    hasImages: false,
    isVerifiedPurchase: true,
    isFlagged: false,
  },
  {
    id: '3',
    productName: 'Premium Cotton T-Shirt',
    productSku: 'PCT-003',
    customerName: 'Bob Johnson',
    customerEmail: 'bob.j@example.com',
    rating: 2,
    title: 'Not what I expected',
    comment:
      'The quality is not as advertised. Fabric feels cheap and shrunk after first wash. Very disappointed with this purchase.',
    status: 'PENDING',
    helpful: 12,
    notHelpful: 18,
    createdAt: '2024-03-15',
    hasImages: false,
    isVerifiedPurchase: true,
    isFlagged: false,
  },
  {
    id: '4',
    productName: 'Organic Green Tea Set',
    productSku: 'OGT-004',
    customerName: 'Alice Brown',
    customerEmail: 'alice.b@example.com',
    rating: 5,
    title: 'Best tea ever!',
    comment:
      'Absolutely love this tea! The flavor is incredible and knowing it is organic makes it even better. Will definitely buy again.',
    status: 'APPROVED',
    helpful: 67,
    notHelpful: 1,
    createdAt: '2024-03-12',
    hasImages: true,
    isVerifiedPurchase: true,
    isFlagged: false,
  },
  {
    id: '5',
    productName: 'Leather Messenger Bag',
    productSku: 'LMB-005',
    customerName: 'Charlie Wilson',
    customerEmail: 'charlie.w@example.com',
    rating: 1,
    title: 'Terrible product! SCAM!',
    comment:
      'This is a complete scam! The bag is fake leather and looks nothing like the pictures. DO NOT BUY!!! Visit my website for better deals...',
    status: 'PENDING',
    helpful: 3,
    notHelpful: 45,
    createdAt: '2024-03-15',
    hasImages: false,
    isVerifiedPurchase: false,
    isFlagged: true,
  },
  {
    id: '6',
    productName: 'Wireless Bluetooth Headphones',
    productSku: 'WBH-001',
    customerName: 'Diana Prince',
    customerEmail: 'diana.p@example.com',
    rating: 4,
    title: 'Good value for money',
    comment:
      'Solid headphones for the price. Sound is good, comfortable to wear for long periods. Would give 5 stars if the charging cable was longer.',
    status: 'APPROVED',
    helpful: 34,
    notHelpful: 3,
    createdAt: '2024-03-11',
    hasImages: false,
    isVerifiedPurchase: true,
    isFlagged: false,
  },
];

export default function ProductReviewsPage() {
  const [reviews] = useState<Review[]>(demoReviews);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const filteredReviews = reviews.filter((review) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !review.productName.toLowerCase().includes(query) &&
        !review.customerName.toLowerCase().includes(query) &&
        !review.title.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && review.status !== statusFilter) {
      return false;
    }
    if (ratingFilter !== 'all' && review.rating !== parseInt(ratingFilter)) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Review['status']) => {
    const styles: Record<Review['status'], string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return styles[status];
  };

  const getStatusIcon = (status: Review['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const totalReviews = reviews.length;
  const pendingReviews = reviews.filter((r) => r.status === 'PENDING').length;
  const approvedReviews = reviews.filter((r) => r.status === 'APPROVED').length;
  const flaggedReviews = reviews.filter((r) => r.isFlagged).length;
  const averageRating =
    reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Product Reviews
            </h1>
            <p className="text-muted-foreground">
              Moderate and manage customer reviews
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{totalReviews}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingReviews}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {approvedReviews}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-red-600">{flaggedReviews}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Rating */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold">{averageRating.toFixed(1)}</p>
              <div className="flex justify-center mt-2">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Average Rating
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length;
                const percentage = (count / totalReviews) * 100;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-3">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product, customer, or review..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <Card
            key={review.id}
            className={review.isFlagged ? 'border-red-300 bg-red-50/50' : ''}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium">{review.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {review.customerName}
                      </span>
                      {review.isVerifiedPurchase && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(review.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(review.status)}
                      {review.status}
                    </span>
                  </Badge>
                </div>

                {/* Product Info */}
                <div className="text-sm text-muted-foreground">
                  Product: <span className="font-medium">{review.productName}</span>{' '}
                  (SKU: {review.productSku})
                </div>

                {/* Review Content */}
                <p className="text-sm">{review.comment}</p>

                {/* Flags */}
                {review.isFlagged && (
                  <div className="flex items-center gap-2 p-3 bg-red-100 rounded-md border border-red-200">
                    <Flag className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-900 font-medium">
                      This review has been flagged for moderation
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{review.helpful}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsDown className="h-4 w-4" />
                      <span>{review.notHelpful}</span>
                    </div>
                    {review.hasImages && (
                      <Badge variant="outline" className="text-xs">
                        Has Images
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {review.status === 'PENDING' && (
                      <>
                        <Button variant="outline" size="sm" className="text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
