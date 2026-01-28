import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  rating: number;
  title: string;
  content: string;
  pros?: string;
  cons?: string;
  images?: string[];
  createdAt: string;
  status: 'published' | 'pending' | 'rejected';
  helpfulCount: number;
}

const mockReviews: Review[] = [
  {
    id: '1',
    productId: 'prod-1',
    productName: 'Premium Wireless Headphones',
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
    rating: 5,
    title: 'Best headphones I\'ve ever owned!',
    content: 'Amazing sound quality and very comfortable to wear for long periods. The noise cancellation is top-notch.',
    pros: 'Great sound, comfortable fit, long battery life',
    cons: 'A bit expensive, but worth it',
    createdAt: '2024-01-15',
    status: 'published',
    helpfulCount: 24,
  },
  {
    id: '2',
    productId: 'prod-2',
    productName: 'Smart Watch Pro',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
    rating: 4,
    title: 'Great features, good value',
    content: 'This smart watch has all the features I need. Battery could be better but overall very satisfied.',
    createdAt: '2024-01-10',
    status: 'published',
    helpfulCount: 12,
  },
  {
    id: '3',
    productId: 'prod-3',
    productName: 'Organic Cotton T-Shirt',
    productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200',
    rating: 5,
    title: 'Perfect fit and quality',
    content: 'The fabric is so soft and the fit is exactly as described. Will definitely buy more colors!',
    createdAt: '2024-01-05',
    status: 'pending',
    helpfulCount: 0,
  },
];

export default function MyReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'pending'>('all');

  const filteredReviews = reviews.filter((review) => {
    if (filter === 'all') return true;
    return review.status === filter;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    // In production, fetch reviews from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleEditReview = (review: Review) => {
    if (review.status !== 'pending') {
      Alert.alert('Cannot Edit', 'Only pending reviews can be edited.');
      return;
    }
    // Navigate to edit screen
    Alert.alert('Edit Review', 'Edit functionality coming soon!');
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setReviews(reviews.filter((r) => r.id !== reviewId));
          },
        },
      ]
    );
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#fbbf24' : '#d1d5db'}
          />
        ))}
      </View>
    );
  };

  const getStatusBadge = (status: Review['status']) => {
    const styles: Record<Review['status'], { bg: string; text: string; label: string }> = {
      published: { bg: '#dcfce7', text: '#166534', label: 'Published' },
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
      rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
    };
    return styles[status];
  };

  const renderReview = ({ item }: { item: Review }) => {
    const statusStyle = getStatusBadge(item.status);

    return (
      <View style={styles.reviewCard}>
        <TouchableOpacity
          style={styles.productInfo}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
        >
          <Image source={{ uri: item.productImage }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.productName}
            </Text>
            {renderStars(item.rating)}
            <Text style={styles.reviewDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg },
            ]}
          >
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.reviewContent}>
          <Text style={styles.reviewTitle}>{item.title}</Text>
          <Text style={styles.reviewText} numberOfLines={3}>
            {item.content}
          </Text>

          {item.pros && (
            <View style={styles.prosConsContainer}>
              <Ionicons name="thumbs-up" size={12} color="#22c55e" />
              <Text style={styles.prosConsText} numberOfLines={1}>
                {item.pros}
              </Text>
            </View>
          )}

          {item.cons && (
            <View style={styles.prosConsContainer}>
              <Ionicons name="thumbs-down" size={12} color="#ef4444" />
              <Text style={styles.prosConsText} numberOfLines={1}>
                {item.cons}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.reviewFooter}>
          {item.status === 'published' && (
            <View style={styles.helpfulContainer}>
              <Ionicons name="thumbs-up-outline" size={16} color="#6b7280" />
              <Text style={styles.helpfulText}>
                {item.helpfulCount} found this helpful
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {item.status === 'pending' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditReview(item)}
              >
                <Ionicons name="pencil" size={18} color="#7c3aed" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteReview(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No Reviews Yet</Text>
      <Text style={styles.emptyText}>
        You haven't written any reviews yet. Share your thoughts on products you've purchased!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'published', 'pending'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== 'all' && ` (${reviews.filter((r) => r.status === tab).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredReviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  filterTabActive: {
    backgroundColor: '#7c3aed',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reviewContent: {
    padding: 12,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  prosConsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  prosConsText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  helpfulContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
