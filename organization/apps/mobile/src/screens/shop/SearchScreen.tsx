import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { productsApi, aiApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
}

const recentSearches = ['Wireless headphones', 'Running shoes', 'Laptop stand', 'Phone case'];
const popularSearches = ['iPhone 15', 'Nike Air Max', 'Samsung TV', 'AirPods Pro'];

const mockResults: Product[] = [
  { id: '1', name: 'Wireless Headphones Pro', price: 79.99, originalPrice: 99.99, image: 'https://via.placeholder.com/150', rating: 4.5, reviewCount: 234, category: 'Electronics' },
  { id: '2', name: 'Bluetooth Headphones', price: 49.99, image: 'https://via.placeholder.com/150', rating: 4.2, reviewCount: 156, category: 'Electronics' },
  { id: '3', name: 'Gaming Headset RGB', price: 89.99, originalPrice: 119.99, image: 'https://via.placeholder.com/150', rating: 4.7, reviewCount: 312, category: 'Electronics' },
  { id: '4', name: 'Noise Cancelling Earbuds', price: 129.99, image: 'https://via.placeholder.com/150', rating: 4.8, reviewCount: 567, category: 'Electronics' },
];

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [useAI, setUseAI] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      if (useAI) {
        const response = await aiApi.searchProducts(query);
        setResults(response.data.products || mockResults);
      } else {
        const response = await productsApi.getProducts({ search: query });
        setResults(response.data.products || mockResults);
      }
    } catch (error) {
      setResults(mockResults);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewCount}>({item.reviewCount} reviews)</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          {item.originalPrice && (
            <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.addToCartButton}>
        <Ionicons name="cart-outline" size={20} color="#6366f1" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSearchSuggestion = (text: string, isRecent: boolean) => (
    <TouchableOpacity
      key={text}
      style={styles.suggestionItem}
      onPress={() => {
        setQuery(text);
        handleSearch();
      }}
    >
      <Ionicons
        name={isRecent ? 'time-outline' : 'trending-up-outline'}
        size={18}
        color="#9ca3af"
      />
      <Text style={styles.suggestionText}>{text}</Text>
      <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.aiToggle, useAI && styles.aiToggleActive]}
          onPress={() => setUseAI(!useAI)}
        >
          <Ionicons name="sparkles" size={18} color={useAI ? '#fff' : '#6366f1'} />
        </TouchableOpacity>
      </View>

      {useAI && (
        <View style={styles.aiHint}>
          <Ionicons name="sparkles" size={14} color="#6366f1" />
          <Text style={styles.aiHintText}>AI-powered search enabled - Try natural language!</Text>
        </View>
      )}

      {/* Filters */}
      {results.length > 0 && (
        <View style={styles.filterBar}>
          <ScrollableFilters />
        </View>
      )}

      {/* Content */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>
            {useAI ? 'AI is finding the best matches...' : 'Searching...'}
          </Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text style={styles.resultsCount}>{results.length} results found</Text>
          )}
        />
      ) : (
        <View style={styles.suggestionsContainer}>
          {/* Recent Searches */}
          <View style={styles.suggestionSection}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>Recent Searches</Text>
              <TouchableOpacity>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((text) => renderSearchSuggestion(text, true))}
          </View>

          {/* Popular Searches */}
          <View style={styles.suggestionSection}>
            <Text style={styles.suggestionTitle}>Popular Searches</Text>
            {popularSearches.map((text) => renderSearchSuggestion(text, false))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function ScrollableFilters() {
  const filters = ['All', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports'];
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <FlatList
      data={filters}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
          onPress={() => setActiveFilter(item)}
        >
          <Text style={[styles.filterChipText, activeFilter === item && styles.filterChipTextActive]}>
            {item}
          </Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item}
      contentContainerStyle={styles.filtersList}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  aiToggle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiToggleActive: {
    backgroundColor: '#6366f1',
  },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: 8,
    gap: 6,
  },
  aiHintText: {
    fontSize: 12,
    color: '#6366f1',
  },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  resultsList: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productCategory: {
    fontSize: 12,
    color: '#6366f1',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  suggestionsContainer: {
    flex: 1,
    padding: 16,
  },
  suggestionSection: {
    marginBottom: 24,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  clearText: {
    fontSize: 14,
    color: '#6366f1',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4b5563',
  },
});
