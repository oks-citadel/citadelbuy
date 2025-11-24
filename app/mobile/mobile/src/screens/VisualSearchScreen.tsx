import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useAppDispatch, useAppSelector } from '../store';
import { visualSearch } from '../store/slices/searchSlice';
import Icon from 'react-native-vector-icons/Ionicons';

const VisualSearchScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { results, isLoading } = useAppSelector((state) => state.search);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleTakePhoto = () => {
    launchCamera({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to take photo');
        return;
      }
      if (response.assets && response.assets[0].uri) {
        const uri = response.assets[0].uri;
        setSelectedImage(uri);
        dispatch(visualSearch(uri));
      }
    });
  };

  const handleChoosePhoto = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to choose photo');
        return;
      }
      if (response.assets && response.assets[0].uri) {
        const uri = response.assets[0].uri;
        setSelectedImage(uri);
        dispatch(visualSearch(uri));
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visual Search</Text>
      <Text style={styles.subtitle}>Take a photo or choose from your library</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleTakePhoto}>
          <Icon name="camera" size={48} color="#007AFF" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleChoosePhoto}>
          <Icon name="images" size={48} color="#007AFF" />
          <Text style={styles.buttonText}>Choose Photo</Text>
        </TouchableOpacity>
      </View>

      {selectedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
        </View>
      )}

      {isLoading && <Text style={styles.loadingText}>Searching...</Text>}

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Similar Products Found:</Text>
          {results.map((item: any) => (
            <View key={item.id} style={styles.resultItem}>
              <Text>{item.name}</Text>
              <Text>${item.price}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  button: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    width: '45%',
  },
  buttonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 12,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
});

export default VisualSearchScreen;
