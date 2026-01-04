import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ImageSourcePropType,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import FALLBACK_PLACEHOLDER from '../../../assets/icon.png';

type CategoriesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Placeholder image configuration
const PLACEHOLDER_CATEGORY_URL = 'https://placehold.co/300x300/e5e7eb/9ca3af?text=Category';
const PLACEHOLDER_FEATURED_URL = 'https://placehold.co/120x120/e5e7eb/9ca3af?text=Product';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: Subcategory[];
  productCount: number;
  image: string;
}

interface Subcategory {
  id: string;
  name: string;
  productCount: number;
}

const categories: Category[] = [
  {
    id: '1',
    name: 'Electronics',
    icon: 'laptop-outline',
    color: '#3b82f6',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 1234,
    subcategories: [
      { id: '1-1', name: 'Smartphones', productCount: 245 },
      { id: '1-2', name: 'Laptops', productCount: 189 },
      { id: '1-3', name: 'Tablets', productCount: 156 },
      { id: '1-4', name: 'Audio', productCount: 312 },
      { id: '1-5', name: 'Wearables', productCount: 178 },
      { id: '1-6', name: 'Cameras', productCount: 98 },
    ],
  },
  {
    id: '2',
    name: 'Fashion',
    icon: 'shirt-outline',
    color: '#ec4899',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 2567,
    subcategories: [
      { id: '2-1', name: "Men's Clothing", productCount: 567 },
      { id: '2-2', name: "Women's Clothing", productCount: 789 },
      { id: '2-3', name: 'Shoes', productCount: 456 },
      { id: '2-4', name: 'Accessories', productCount: 345 },
      { id: '2-5', name: 'Jewelry', productCount: 234 },
      { id: '2-6', name: 'Bags', productCount: 176 },
    ],
  },
  {
    id: '3',
    name: 'Home & Garden',
    icon: 'home-outline',
    color: '#f59e0b',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 1876,
    subcategories: [
      { id: '3-1', name: 'Furniture', productCount: 345 },
      { id: '3-2', name: 'Decor', productCount: 456 },
      { id: '3-3', name: 'Kitchen', productCount: 378 },
      { id: '3-4', name: 'Bedding', productCount: 234 },
      { id: '3-5', name: 'Garden', productCount: 189 },
      { id: '3-6', name: 'Lighting', productCount: 156 },
    ],
  },
  {
    id: '4',
    name: 'Beauty',
    icon: 'sparkles-outline',
    color: '#8b5cf6',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 987,
    subcategories: [
      { id: '4-1', name: 'Skincare', productCount: 234 },
      { id: '4-2', name: 'Makeup', productCount: 345 },
      { id: '4-3', name: 'Hair Care', productCount: 178 },
      { id: '4-4', name: 'Fragrance', productCount: 134 },
      { id: '4-5', name: 'Bath & Body', productCount: 96 },
    ],
  },
  {
    id: '5',
    name: 'Sports & Fitness',
    icon: 'fitness-outline',
    color: '#10b981',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 756,
    subcategories: [
      { id: '5-1', name: 'Exercise Equipment', productCount: 156 },
      { id: '5-2', name: 'Sportswear', productCount: 234 },
      { id: '5-3', name: 'Outdoor', productCount: 178 },
      { id: '5-4', name: 'Team Sports', productCount: 98 },
      { id: '5-5', name: 'Yoga', productCount: 90 },
    ],
  },
  {
    id: '6',
    name: 'Books & Media',
    icon: 'book-outline',
    color: '#6366f1',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 1456,
    subcategories: [
      { id: '6-1', name: 'Fiction', productCount: 345 },
      { id: '6-2', name: 'Non-Fiction', productCount: 289 },
      { id: '6-3', name: 'Textbooks', productCount: 234 },
      { id: '6-4', name: 'Music', productCount: 312 },
      { id: '6-5', name: 'Movies', productCount: 276 },
    ],
  },
  {
    id: '7',
    name: 'Toys & Games',
    icon: 'game-controller-outline',
    color: '#ef4444',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 654,
    subcategories: [
      { id: '7-1', name: 'Video Games', productCount: 234 },
      { id: '7-2', name: 'Board Games', productCount: 156 },
      { id: '7-3', name: 'Action Figures', productCount: 134 },
      { id: '7-4', name: 'Educational', productCount: 130 },
    ],
  },
  {
    id: '8',
    name: 'Groceries',
    icon: 'cart-outline',
    color: '#14b8a6',
    image: PLACEHOLDER_CATEGORY_URL,
    productCount: 2345,
    subcategories: [
      { id: '8-1', name: 'Fresh Food', productCount: 567 },
      { id: '8-2', name: 'Pantry', productCount: 678 },
      { id: '8-3', name: 'Beverages', productCount: 456 },
      { id: '8-4', name: 'Snacks', productCount: 345 },
      { id: '8-5', name: 'Organic', productCount: 299 },
    ],
  },
];

export default function CategoriesScreen() {
  const navigation = useNavigation<CategoriesScreenNavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((imageId: string) => {
    setFailedImages(prev => new Set(prev).add(imageId));
  }, []);

  const getImageSource = useCallback((imageUrl: string, imageId: string): ImageSourcePropType => {
    if (failedImages.has(imageId)) {
      return FALLBACK_PLACEHOLDER;
    }
    return { uri: imageUrl };
  }, [failedImages]);

  const { data: apiCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories(),
  });

  const renderCategoryTab = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
        onPress={() => setSelectedCategory(item)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        <Text style={[styles.categoryTabText, isSelected && styles.categoryTabTextActive]}>
          {item.name}
        </Text>
        {isSelected && <View style={[styles.activeIndicator, { backgroundColor: item.color }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Category Sidebar */}
        <View style={styles.sidebar}>
          <FlatList
            data={categories}
            renderItem={renderCategoryTab}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Category Content */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {/* Category Header */}
          <View style={styles.categoryHeader}>
            <Image
              source={getImageSource(selectedCategory.image, `category-${selectedCategory.id}`)}
              style={styles.categoryImage}
              onError={() => handleImageError(`category-${selectedCategory.id}`)}
            />
            <View style={styles.categoryOverlay}>
              <Text style={styles.categoryTitle}>{selectedCategory.name}</Text>
              <Text style={styles.categoryCount}>
                {selectedCategory.productCount.toLocaleString()} products
              </Text>
            </View>
          </View>

          {/* Subcategories Grid */}
          <View style={styles.subcategoriesGrid}>
            {/* View All */}
            <TouchableOpacity style={styles.subcategoryCard}>
              <View style={[styles.subcategoryIcon, { backgroundColor: selectedCategory.color + '20' }]}>
                <Ionicons name="grid-outline" size={24} color={selectedCategory.color} />
              </View>
              <Text style={styles.subcategoryName}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>

            {selectedCategory.subcategories.map((sub) => (
              <TouchableOpacity key={sub.id} style={styles.subcategoryCard}>
                <View style={styles.subcategoryInfo}>
                  <Text style={styles.subcategoryName}>{sub.name}</Text>
                  <Text style={styles.subcategoryCount}>{sub.productCount} items</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Featured in Category */}
          <View style={styles.featuredSection}>
            <Text style={styles.featuredTitle}>Featured in {selectedCategory.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3, 4].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.featuredItem}
                  onPress={() => navigation.navigate('ProductDetail', { productId: String(item) })}
                >
                  <Image
                    source={getImageSource(PLACEHOLDER_FEATURED_URL, `featured-${selectedCategory.id}-${item}`)}
                    style={styles.featuredImage}
                    onError={() => handleImageError(`featured-${selectedCategory.id}-${item}`)}
                  />
                  <Text style={styles.featuredName} numberOfLines={2}>
                    Product Name Here
                  </Text>
                  <Text style={styles.featuredPrice}>$49.99</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Brands */}
          <View style={styles.brandsSection}>
            <Text style={styles.brandsTitle}>Popular Brands</Text>
            <View style={styles.brandsGrid}>
              {['Apple', 'Samsung', 'Sony', 'LG', 'Nike', 'Adidas'].slice(0, 6).map((brand) => (
                <TouchableOpacity key={brand} style={styles.brandItem}>
                  <View style={styles.brandLogo}>
                    <Text style={styles.brandInitial}>{brand[0]}</Text>
                  </View>
                  <Text style={styles.brandName}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 80,
    backgroundColor: '#f9fafb',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  categoryTab: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    position: 'relative',
  },
  categoryTabActive: {
    backgroundColor: '#fff',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryTabText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  categoryTabTextActive: {
    color: '#1f2937',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 3,
    borderRadius: 2,
  },
  mainContent: {
    flex: 1,
  },
  categoryHeader: {
    height: 160,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  subcategoriesGrid: {
    padding: 16,
  },
  subcategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subcategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginRight: 8,
  },
  subcategoryCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  featuredSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  featuredItem: {
    width: 120,
    marginRight: 12,
  },
  featuredImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  featuredName: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
  },
  featuredPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  brandsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  brandsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandItem: {
    alignItems: 'center',
    width: 70,
  },
  brandLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  brandName: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 24,
  },
});
