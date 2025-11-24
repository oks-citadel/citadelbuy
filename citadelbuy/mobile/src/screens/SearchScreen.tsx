import React, { useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { searchProducts, setQuery } from '../store/slices/searchSlice';

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { query, results, isLoading } = useAppSelector((state) => state.search);
  const [localQuery, setLocalQuery] = useState(query);

  const handleSearch = () => {
    dispatch(setQuery(localQuery));
    dispatch(searchProducts(localQuery));
  };

  const handleVisualSearch = () => {
    navigation.navigate('VisualSearch');
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={localQuery}
          onChangeText={setLocalQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Icon name="search" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleVisualSearch} style={styles.cameraButton}>
          <Icon name="camera" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Searching...</Text>
      ) : (
        <FlatList
          data={results}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultPrice}>${item.price}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  searchButton: {
    marginLeft: 8,
    padding: 8,
  },
  cameraButton: {
    marginLeft: 8,
    padding: 8,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultPrice: {
    fontSize: 14,
    color: '#007AFF',
  },
});

export default SearchScreen;
