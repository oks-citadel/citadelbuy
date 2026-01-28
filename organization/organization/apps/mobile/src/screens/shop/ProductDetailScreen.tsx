import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, cartApi, wishlistApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  category: string;
  brand: string;
  inStock: boolean;
  stockCount: number;
  variants: Variant[];
  specifications: { label: string; value: string }[];
  features: string[];
}

interface Variant {
  id: string;
  name: string;
  type: 'color' | 'size';
  value: string;
  available: boolean;
}

const mockProduct: Product = {
  id: '1',
  name: 'Wireless Noise Cancelling Headphones Pro',
  description: 'Experience premium sound quality with our latest wireless headphones. Featuring advanced noise cancellation technology, 40-hour battery life, and ultra-comfortable ear cushions for extended listening sessions.',
  price: 249.99,
  originalPrice: 299.99,
  images: [
    'https://via.placeholder.com/400',
    'https://via.placeholder.com/400',
    'https://via.placeholder.com/400',
  ],
  rating: 4.8,
  reviewCount: 1234,
  category: 'Electronics',
  brand: 'AudioTech',
  inStock: true,
  stockCount: 23,
  variants: [
    { id: 'v1', name: 'Black', type: 'color', value: '#000000', available: true },
    { id: 'v2', name: 'White', type: 'color', value: '#ffffff', available: true },
    { id: 'v3', name: 'Silver', type: 'color', value: '#c0c0c0', available: false },
  ],
  specifications: [
    { label: 'Driver Size', value: '40mm' },
    { label: 'Frequency Response', value: '20Hz - 20kHz' },
    { label: 'Battery Life', value: '40 hours' },
    { label: 'Charging Time', value: '2 hours' },
    { label: 'Weight', value: '250g' },
    { label: 'Connectivity', value: 'Bluetooth 5.2' },
  ],
  features: [
    'Active Noise Cancellation',
    'Transparency Mode',
    'Multi-device pairing',
    'Touch controls',
    'Voice assistant support',
    'Foldable design',
  ],
};

export default function ProductDetailScreen() {
  const navigation = useNavigation<ProductDetailNavigationProp>();
  const route = useRoute<ProductDetailRouteProp>();
  const queryClient = useQueryClient();
  const { productId } = route.params;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string>('v1');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getProduct(productId),
  });

  const addToCartMutation = useMutation({
    mutationFn: () => cartApi.addItem(productId, quantity, selectedVariant),
    onSuccess: () => {
      Alert.alert('Success', 'Added to cart!');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add to cart');
    },
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: () => isWishlisted
      ? wishlistApi.removeItem(productId)
      : wishlistApi.addItem(productId),
    onSuccess: () => {
      setIsWishlisted(!isWishlisted);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const productData = product?.data || mockProduct;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedImage(index);
            }}
          >
            {productData.images.map((image: string, index: number) => (
              <Image key={index} source={{ uri: image }} style={styles.mainImage} />
            ))}
          </ScrollView>
          <View style={styles.imageDots}>
            {productData.images.map((_: unknown, index: number) => (
              <View
                key={index}
                style={[styles.dot, selectedImage === index && styles.activeDot]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={() => toggleWishlistMutation.mutate()}
            accessibilityLabel={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            accessibilityHint={isWishlisted ? "Remove this product from your wishlist" : "Save this product to your wishlist"}
            accessibilityRole="button"
            accessibilityState={{ selected: isWishlisted }}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={24}
              color={isWishlisted ? '#ef4444' : '#1f2937'}
            />
          </TouchableOpacity>
          {productData.originalPrice && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleBadgeText}>
                {Math.round((1 - productData.price / productData.originalPrice) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.brand}>{productData.brand}</Text>
          <Text style={styles.productName}>{productData.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.floor(productData.rating) ? 'star' : 'star-outline'}
                  size={16}
                  color="#f59e0b"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{productData.rating}</Text>
            <Text style={styles.reviewCount}>({productData.reviewCount} reviews)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>${productData.price.toFixed(2)}</Text>
            {productData.originalPrice && (
              <Text style={styles.originalPrice}>${productData.originalPrice.toFixed(2)}</Text>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockRow}>
            <View style={[styles.stockBadge, !productData.inStock && styles.outOfStock]}>
              <Ionicons
                name={productData.inStock ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={productData.inStock ? '#10b981' : '#ef4444'}
              />
              <Text style={[styles.stockText, !productData.inStock && styles.outOfStockText]}>
                {productData.inStock ? `In Stock (${productData.stockCount} left)` : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Variants */}
          <View style={styles.variantsSection}>
            <Text style={styles.sectionTitle}>Color</Text>
            <View style={styles.variantOptions}>
              {productData.variants.map((variant: any) => (
                <TouchableOpacity
                  key={variant.id}
                  style={[
                    styles.variantButton,
                    selectedVariant === variant.id && styles.variantButtonSelected,
                    !variant.available && styles.variantButtonDisabled,
                  ]}
                  onPress={() => variant.available && setSelectedVariant(variant.id)}
                  disabled={!variant.available}
                  accessibilityLabel={`${variant.name} color${selectedVariant === variant.id ? ', selected' : ''}${!variant.available ? ', unavailable' : ''}`}
                  accessibilityHint={variant.available ? `Select ${variant.name} color option` : `${variant.name} color is currently unavailable`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedVariant === variant.id, disabled: !variant.available }}
                >
                  <View
                    style={[styles.colorSwatch, { backgroundColor: variant.value }]}
                  />
                  <Text style={[
                    styles.variantText,
                    selectedVariant === variant.id && styles.variantTextSelected,
                    !variant.available && styles.variantTextDisabled,
                  ]}>
                    {variant.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                accessibilityLabel="Decrease quantity"
                accessibilityHint={quantity > 1 ? `Reduce quantity to ${quantity - 1}` : "Minimum quantity is 1"}
                accessibilityRole="button"
                accessibilityState={{ disabled: quantity <= 1 }}
              >
                <Ionicons name="remove" size={20} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.quantityText} accessibilityLabel={`Quantity: ${quantity}`}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
                accessibilityLabel="Increase quantity"
                accessibilityHint={`Increase quantity to ${quantity + 1}`}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={20} color="#1f2937" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{productData.description}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Features</Text>
            {productData.features.map((feature: string, index: number) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Specifications */}
          <View style={styles.specificationsSection}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {productData.specifications.map((spec: { label: string; value: string }, index: number) => (
              <View key={index} style={styles.specRow}>
                <Text style={styles.specLabel}>{spec.label}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('AIAssistant')}
          accessibilityLabel="Chat with AI assistant"
          accessibilityHint="Open AI assistant to ask questions about this product"
          accessibilityRole="button"
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addToCartButton, !productData.inStock && styles.disabledButton]}
          onPress={() => addToCartMutation.mutate()}
          disabled={!productData.inStock || addToCartMutation.isPending}
          accessibilityLabel="Add to Cart"
          accessibilityHint={productData.inStock ? `Add ${quantity} item${quantity > 1 ? 's' : ''} to your shopping cart` : "This product is out of stock"}
          accessibilityRole="button"
          accessibilityState={{ disabled: !productData.inStock || addToCartMutation.isPending }}
        >
          {addToCartMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowButton, !productData.inStock && styles.disabledButton]}
          onPress={() => {
            addToCartMutation.mutate();
            navigation.navigate('Checkout');
          }}
          disabled={!productData.inStock}
          accessibilityLabel="Buy Now"
          accessibilityHint={productData.inStock ? "Add to cart and proceed to checkout immediately" : "This product is out of stock"}
          accessibilityRole="button"
          accessibilityState={{ disabled: !productData.inStock }}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGallery: {
    position: 'relative',
  },
  mainImage: {
    width,
    height: 400,
    backgroundColor: '#f3f4f6',
  },
  imageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },
  wishlistButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  saleBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productInfo: {
    padding: 16,
  },
  brand: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  stockRow: {
    marginBottom: 20,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  outOfStock: {
    backgroundColor: '#fef2f2',
  },
  stockText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
    fontWeight: '500',
  },
  outOfStockText: {
    color: '#ef4444',
  },
  variantsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  variantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  variantButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  variantButtonDisabled: {
    opacity: 0.5,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  variantText: {
    fontSize: 14,
    color: '#4b5563',
  },
  variantTextSelected: {
    color: '#6366f1',
    fontWeight: '500',
  },
  variantTextDisabled: {
    color: '#9ca3af',
  },
  quantitySection: {
    marginBottom: 20,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 24,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  specificationsSection: {
    marginBottom: 100,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  specLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  specValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  chatButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 52,
    gap: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buyNowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    height: 52,
  },
  buyNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
