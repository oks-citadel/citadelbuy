import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  ImageErrorEventData,
  NativeSyntheticEvent,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { RootStackParamList } from '../../types/navigation';
import FALLBACK_PLACEHOLDER from '../../../assets/icon.png';

type ARTryOnRouteProp = RouteProp<RootStackParamList, 'ARTryOn'>;
type ARTryOnNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

// Placeholder image configuration
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/100x100/e5e7eb/9ca3af?text=Product';

// Supported product categories for AR
type ARCategory = 'eyewear' | 'accessories' | 'jewelry' | 'hats' | 'watches' | 'furniture';

interface ARProduct {
  id: string;
  name: string;
  image: string;
  arModel?: string;
  category: ARCategory;
  price: number;
}

// Mock AR products for demo
const mockARProducts: ARProduct[] = [
  { id: '1', name: 'Classic Sunglasses', image: PLACEHOLDER_IMAGE_URL, category: 'eyewear', price: 129.99 },
  { id: '2', name: 'Aviator Glasses', image: PLACEHOLDER_IMAGE_URL, category: 'eyewear', price: 149.99 },
  { id: '3', name: 'Round Frames', image: PLACEHOLDER_IMAGE_URL, category: 'eyewear', price: 99.99 },
  { id: '4', name: 'Cat Eye Shades', image: PLACEHOLDER_IMAGE_URL, category: 'eyewear', price: 159.99 },
];

export default function ARTryOnScreen() {
  const navigation = useNavigation<ARTryOnNavigationProp>();
  const route = useRoute<ARTryOnRouteProp>();
  const cameraRef = useRef<Camera>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.front);
  const [isARActive, setIsARActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ARProduct | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [arOverlayPosition, setAROverlayPosition] = useState({ x: width / 2, y: height / 3 });
  const [arOverlayScale, setAROverlayScale] = useState(1);
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

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus.status !== 'granted') {
        Alert.alert('Permission required', 'Media library access is needed to save photos');
      }
    })();
  }, []);

  const toggleCameraType = () => {
    setCameraType(current => (current === CameraType.back ? CameraType.front : CameraType.back));
  };

  const capturePhoto = async () => {
    if (cameraRef.current && !isCapturing) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });

        if (photo?.uri) {
          await MediaLibrary.saveToLibraryAsync(photo.uri);
          Alert.alert('Photo Saved!', 'Your AR try-on photo has been saved to your gallery.');
        }
      } catch (error) {
        console.error('Failed to capture photo:', error);
        Alert.alert('Error', 'Failed to capture photo');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleProductSelect = (product: ARProduct) => {
    setSelectedProduct(product);
    setIsARActive(true);
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      // Navigate to product detail or add to cart
      Alert.alert(
        'Add to Cart',
        `Would you like to add ${selectedProduct.name} to your cart?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Cart',
            onPress: () => {
              // Call cart API
              Alert.alert('Success', 'Added to cart!');
            },
          },
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionDenied}>
        <Ionicons name="camera-outline" size={64} color="#9ca3af" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Please enable camera access in your device settings to use AR Try-On
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.settingsButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
      >
        {/* AR Overlay - Simulated for demo */}
        {isARActive && selectedProduct && (
          <View
            style={[
              styles.arOverlay,
              {
                left: arOverlayPosition.x - 75,
                top: arOverlayPosition.y - 30,
                transform: [{ scale: arOverlayScale }],
              },
            ]}
          >
            {/* This would be replaced with actual AR rendering from ARKit/ARCore */}
            <Image
              source={getImageSource(selectedProduct.image, `ar-${selectedProduct.id}`)}
              style={styles.arProductImage}
              resizeMode="contain"
              onError={() => handleImageError(`ar-${selectedProduct.id}`)}
            />
          </View>
        )}

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AR Try-On</Text>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* AR Status Indicator */}
        {isARActive && (
          <View style={styles.arStatusBadge}>
            <View style={styles.arDot} />
            <Text style={styles.arStatusText}>AR Active</Text>
          </View>
        )}

        {/* Selected Product Info */}
        {selectedProduct && (
          <View style={styles.selectedProductCard}>
            <Image
              source={getImageSource(selectedProduct.image, `selected-${selectedProduct.id}`)}
              style={styles.selectedProductImage}
              onError={() => handleImageError(`selected-${selectedProduct.id}`)}
            />
            <View style={styles.selectedProductInfo}>
              <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
              <Text style={styles.selectedProductPrice}>${selectedProduct.price.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.addToCartMini}
              onPress={handleAddToCart}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* AR Position/Scale Controls */}
        {isARActive && (
          <View style={styles.arControls}>
            <View style={styles.arControlRow}>
              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => setAROverlayPosition(pos => ({ ...pos, y: pos.y - 10 }))}
              >
                <Ionicons name="chevron-up" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.arControlRow}>
              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => setAROverlayPosition(pos => ({ ...pos, x: pos.x - 10 }))}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => setAROverlayScale(s => Math.min(s + 0.1, 2))}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => setAROverlayScale(s => Math.max(s - 0.1, 0.5))}
              >
                <Ionicons name="remove" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => setAROverlayPosition(pos => ({ ...pos, x: pos.x + 10 }))}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.arControlRow}>
              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => setAROverlayPosition(pos => ({ ...pos, y: pos.y + 10 }))}
              >
                <Ionicons name="chevron-down" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Capture Button */}
        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={capturePhoto}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#6366f1" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
        </View>
      </Camera>

      {/* Product Selector */}
      <View style={styles.productSelector}>
        <Text style={styles.selectorTitle}>Select a product to try on</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
        >
          {mockARProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.productCard,
                selectedProduct?.id === product.id && styles.productCardSelected,
              ]}
              onPress={() => handleProductSelect(product)}
            >
              <Image
                source={getImageSource(product.image, `list-${product.id}`)}
                style={styles.productImage}
                onError={() => handleImageError(`list-${product.id}`)}
              />
              <Text style={styles.productName} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* AR Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
        <Text style={styles.infoText}>
          Position your face in the camera and select a product to see how it looks on you!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  permissionDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  settingsButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arStatusBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  arDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  arStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  arOverlay: {
    position: 'absolute',
    width: 150,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arProductImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  selectedProductCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 150 : 130,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  selectedProductInfo: {
    marginLeft: 8,
    marginRight: 8,
  },
  selectedProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectedProductPrice: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
  addToCartMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arControls: {
    position: 'absolute',
    right: 16,
    top: '40%',
    alignItems: 'center',
  },
  arControlRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  arControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  captureContainer: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
  },
  productSelector: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  productList: {
    paddingHorizontal: 12,
  },
  productCard: {
    width: 90,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 6,
  },
  productName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
  },
  infoBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4b5563',
    marginLeft: 8,
  },
});
