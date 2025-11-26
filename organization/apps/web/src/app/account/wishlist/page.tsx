'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWishlistStore } from '@/stores/account-store';
import { useCartStore } from '@/stores/cart-store';
import {
  Heart,
  Trash2,
  ShoppingCart,
  FolderPlus,
  Share2,
  Bell,
  Grid,
  List,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function WishlistPage() {
  const {
    items,
    collections,
    isLoading,
    fetchWishlist,
    fetchCollections,
    removeFromWishlist,
    clearWishlist,
    createCollection,
  } = useWishlistStore();
  const { addItem } = useCartStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    fetchWishlist();
    fetchCollections();
  }, [fetchWishlist, fetchCollections]);

  const handleAddToCart = (item: typeof items[0]) => {
    addItem({
      id: item.product.id,
      product: item.product,
      quantity: 1,
      price: item.product.price,
      total: item.product.price,
      addedAt: new Date().toISOString(),
    });
  };

  const handleCreateCollection = async () => {
    if (newCollectionName.trim()) {
      await createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setShowCreateCollection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4">
              <div className="animate-pulse space-y-4">
                <div className="h-40 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-gray-600 mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-gray-100' : ''}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-gray-100' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearWishlist}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateCollection(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/account/wishlist/collections/${collection.id}`}
                className="p-4 border rounded-lg hover:border-primary transition-colors"
              >
                <p className="font-medium text-gray-900">{collection.name}</p>
                <p className="text-sm text-gray-500">
                  {collection.items.length} items
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Collection
            </h3>
            <Input
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateCollection(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCollection}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Items */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-500 mb-6">
              Save items you love by clicking the heart icon
            </p>
            <Link href="/products">
              <Button>Discover Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="group">
              <div className="relative">
                <Link href={`/products/${item.product.slug}`}>
                  <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                    {item.product.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => removeFromWishlist(item.productId)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-md hover:bg-red-50 transition-colors"
                >
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                </button>
                {item.product.compareAtPrice && (
                  <Badge className="absolute top-2 left-2 bg-red-500">
                    Sale
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <Link href={`/products/${item.product.slug}`}>
                  <h3 className="font-medium text-gray-900 line-clamp-2 hover:text-primary">
                    {item.product.name}
                  </h3>
                </Link>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    ${item.product.price.toFixed(2)}
                  </span>
                  {item.product.compareAtPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      ${item.product.compareAtPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                {item.product.inventory.status !== 'IN_STOCK' && (
                  <Badge variant="outline" className="mt-2 text-yellow-600">
                    {item.product.inventory.status.replace(/_/g, ' ')}
                  </Badge>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToCart(item)}
                    disabled={item.product.inventory.status === 'OUT_OF_STOCK'}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="flex-shrink-0"
                  >
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                      {item.product.images?.[0]?.url ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product.slug}`}>
                      <h3 className="font-medium text-gray-900 hover:text-primary">
                        {item.product.name}
                      </h3>
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        ${item.product.price.toFixed(2)}
                      </span>
                      {item.product.compareAtPrice && (
                        <>
                          <span className="text-sm text-gray-500 line-through">
                            ${item.product.compareAtPrice.toFixed(2)}
                          </span>
                          <Badge className="bg-red-500">
                            {Math.round(
                              (1 - item.product.price / item.product.compareAtPrice) *
                                100
                            )}
                            % off
                          </Badge>
                        </>
                      )}
                    </div>
                    {item.note && (
                      <p className="text-sm text-gray-500 mt-1">{item.note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(item)}
                      disabled={item.product.inventory.status === 'OUT_OF_STOCK'}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromWishlist(item.productId)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
