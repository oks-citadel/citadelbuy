'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReviewsStore } from '@/stores/account-store';
import {
  Star,
  Edit,
  Trash2,
  ThumbsUp,
  Package,
  Camera,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ReviewsPage() {
  const { myReviews, isLoading, fetchMyReviews, deleteReview } = useReviewsStore();

  useEffect(() => {
    fetchMyReviews();
  }, [fetchMyReviews]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-40 bg-gray-200 rounded" />
              <div className="h-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
            <p className="text-gray-600 mt-1">
              {myReviews.length} review{myReviews.length !== 1 ? 's' : ''} written
            </p>
          </div>
          <Link href="/account/orders">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Write a Review
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {myReviews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{myReviews.length}</p>
              <p className="text-sm text-gray-500">Total Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">
                {(
                  myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length
                ).toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">Avg. Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">
                {myReviews.reduce((acc, r) => acc + r.helpful, 0)}
              </p>
              <p className="text-sm text-gray-500">Helpful Votes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">
                {myReviews.filter((r) => r.verified).length}
              </p>
              <p className="text-sm text-gray-500">Verified Reviews</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reviews List */}
      {myReviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No reviews yet
            </h3>
            <p className="text-gray-500 mb-6">
              Share your thoughts on products you've purchased
            </p>
            <Link href="/account/orders">
              <Button>Browse Past Orders</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link
                    href={`/products/${review.productId}`}
                    className="flex-shrink-0"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                      <Package className="w-full h-full p-4 text-gray-400" />
                    </div>
                  </Link>

                  {/* Review Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {renderStars(review.rating)}
                          {review.verified && (
                            <Badge className="bg-green-100 text-green-800">
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900">
                          {review.title}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => deleteReview(review.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-gray-600 mt-2">{review.content}</p>

                    {/* Pros & Cons */}
                    {(review.pros?.length || review.cons?.length) && (
                      <div className="flex gap-6 mt-3">
                        {review.pros && review.pros.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-green-600 mb-1">
                              Pros
                            </p>
                            <ul className="text-sm text-gray-600 space-y-0.5">
                              {review.pros.map((pro, i) => (
                                <li key={i}>+ {pro}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {review.cons && review.cons.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-red-600 mb-1">
                              Cons
                            </p>
                            <ul className="text-sm text-gray-600 space-y-0.5">
                              {review.cons.map((con, i) => (
                                <li key={i}>- {con}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {review.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {review.helpful} found helpful
                        </span>
                      </div>

                      {/* Seller Response */}
                      {review.response && (
                        <Badge variant="outline">Seller responded</Badge>
                      )}
                    </div>

                    {/* Seller Response Content */}
                    {review.response && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Seller Response
                        </p>
                        <p className="text-sm text-gray-600">
                          {review.response.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(review.response.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            Tips for Writing Great Reviews
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Star className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Be specific about what you liked or didn't like
            </li>
            <li className="flex items-start gap-2">
              <Camera className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Add photos to help other shoppers
            </li>
            <li className="flex items-start gap-2">
              <ThumbsUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Mention pros and cons for a balanced review
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
