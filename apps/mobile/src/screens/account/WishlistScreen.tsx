import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistApi, cartApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';

type WishlistScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  addedAt: string;
}

const mockWishlist: WishlistItem[] = [
  { id: '1', productId: 'p1', name: 'Wireless Noise Cancelling Headphones', image: 'https://via.placeholder.com/120', price: 249.99, originalPrice: 299.99, inStock: true, addedAt: '2024-01-10' },
  { id: '2', productId: 'p2', name: 'Smart Watch Pro', image: 'https://via.placeholder.com/120', price: 399.99, inStock: true, addedAt: '2024-01-08' },
  { id: '3', productId: 'p3', name: 'Premium Laptop Stand', image: 'https://via.placeholder.com/120', price: 79.99, inStock: false, addedAt: '2024-01-05' },
  { id: '4', productId: 'p4', name: 'Bluetooth Speaker Mini', image: 'https://via.placeholder.com/120', price: 49.99, originalPrice: 69.99, inStock: true, addedAt: '2024-01-03' },
];

export default function WishlistScreen() {
  const navigation = useNavigation<WishlistScreenNavigationProp>();
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getWishlist(),
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.removeItem(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => cartApi.addItem(productId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Success', 'Added to cart!');
    },
  });

  const wishlistItems = wishlist?.data || mockWishlist;

  const handleRemove = (item: WishlistItem) => {
    Alert.alert(
      'Remove from Wishlist',
      `Remove "${item.name}" from your wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromWishlistMutation.mutate(item.productId) },
      ]
    );
  };

  const renderItem = ({ item }: { item: WishlistItem }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
      >
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        {item.originalPrice && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>
              {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
            </Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            {item.originalPrice && (
              <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.stockRow}>
            <Ionicons
              name={item.inStock ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={item.inStock ? '#10b981' : '#ef4444'}
            />
            <Text style={[styles.stockText, !item.inStock && styles.outOfStock]}>
              {item.inStock ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.addToCartButton, !item.inStock && styles.addToCartButtonDisabled]}
          onPress={() => addToCartMutation.mutate(item.productId)}
          disabled={!item.inStock}
        >
          <Ionicons name="cart-outline" size={18} color={item.inStock ? '#fff' : '#9ca3af'} />
          <Text style={[styles.addToCartText, !item.inStock && styles.addToCartTextDisabled]}>
            {item.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="heart-outline" size={64} color="#d1d5db" />
        </View>
        <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
        <Text style={styles.emptyText}>
          Save items you love by tapping the heart icon
        </Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{wishlistItems.length} Items</Text>
        <TouchableOpacity>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={wishlistItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  shareText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  saleBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
  },
  outOfStock: {
    color: '#ef4444',
  },
  itemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 12,
    gap: 8,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addToCartButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addToCartTextDisabled: {
    color: '#9ca3af',
  },
  removeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
});
