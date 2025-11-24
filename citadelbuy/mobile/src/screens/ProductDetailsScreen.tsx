import React, { useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchProductById } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { productId } = route.params as { productId: string };
  const { currentProduct, isLoading } = useAppSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchProductById(productId));
  }, [dispatch, productId]);

  const handleAddToCart = () => {
    if (currentProduct) {
      dispatch(addToCart({
        id: Date.now().toString(),
        productId: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        quantity: 1,
        image: currentProduct.images[0],
      }));
    }
  };

  if (isLoading || !currentProduct) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: currentProduct.images[0] }} style={styles.mainImage} />
      <View style={styles.content}>
        <Text style={styles.title}>{currentProduct.name}</Text>
        <Text style={styles.price}>${currentProduct.price}</Text>
        <Text style={styles.description}>{currentProduct.description}</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProductDetailsScreen;
