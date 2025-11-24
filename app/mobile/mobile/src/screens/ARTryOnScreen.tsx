import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AIService from '../services/ai-services';

const ARTryOnScreen = ({ route }: any) => {
  const { product } = route.params || {};
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tryOnResult, setTryOnResult] = useState<any>(null);
  const [fitRecommendation, setFitRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      cameraType: 'front',
    });

    if (result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (uri) {
        setSelectedImage(uri);
        await processTryOn(uri);
      }
    }
  };

  const handleSelectPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (uri) {
        setSelectedImage(uri);
        await processTryOn(uri);
      }
    }
  };

  const processTryOn = async (imageUri: string) => {
    try {
      setLoading(true);

      // Generate virtual try-on
      const tryOnResponse = await AIService.arTryOn.generateVirtualTryOn(
        imageUri,
        product.id,
      );
      setTryOnResult(tryOnResponse);

      // Get fit recommendation
      const fitResponse = await AIService.arTryOn.getFitRecommendation(product.id);
      setFitRecommendation(fitResponse);
    } catch (error) {
      console.error('AR Try-On error:', error);
      Alert.alert('Error', 'Failed to process virtual try-on');
    } finally {
      setLoading(false);
    }
  };

  const handleGetMeasurements = async () => {
    if (!selectedImage) {
      Alert.alert('No Photo', 'Please take or select a photo first');
      return;
    }

    try {
      setLoading(true);
      const measurements = await AIService.arTryOn.extractBodyMeasurements(selectedImage);
      Alert.alert('Measurements', JSON.stringify(measurements.measurements, null, 2));
    } catch (error) {
      console.error('Measurement error:', error);
      Alert.alert('Error', 'Failed to extract measurements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AR Virtual Try-On</Text>
        <Text style={styles.subtitle}>{product?.name || 'Select a product'}</Text>
      </View>

      {!selectedImage ? (
        <View style={styles.photoOptions}>
          <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
            <Text style={styles.photoButtonText}>📸 Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={handleSelectPhoto}>
            <Text style={styles.photoButtonText}>🖼️ Choose Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.image} />
          <TouchableOpacity style={styles.retakeButton} onPress={() => setSelectedImage(null)}>
            <Text style={styles.retakeButtonText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing AR Try-On...</Text>
        </View>
      )}

      {tryOnResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Virtual Try-On Result</Text>
          <Image
            source={{ uri: tryOnResult.tryonImage }}
            style={styles.tryOnImage}
            resizeMode="contain"
          />
          <View style={styles.fitInfo}>
            <Text style={styles.fitLabel}>Fit Analysis:</Text>
            <Text style={styles.fitText}>
              Shoulder Fit: {tryOnResult.fit?.shoulderFit}
            </Text>
            <Text style={styles.fitText}>
              Chest Fit: {tryOnResult.fit?.chestFit}
            </Text>
            <Text style={styles.fitText}>
              Overall: {tryOnResult.fit?.overallFit}
            </Text>
            <Text style={styles.confidence}>
              Confidence: {(tryOnResult.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      {fitRecommendation && (
        <View style={styles.recommendationContainer}>
          <Text style={styles.resultTitle}>Size Recommendation</Text>
          <View style={styles.sizeBox}>
            <Text style={styles.sizeLabel}>Recommended Size:</Text>
            <Text style={styles.sizeValue}>{fitRecommendation.recommendation.size}</Text>
            <Text style={styles.sizeConfidence}>
              {(fitRecommendation.confidence * 100).toFixed(0)}% confident
            </Text>
          </View>

          <Text style={styles.reasoningTitle}>Why this size?</Text>
          {fitRecommendation.recommendation.reasoning?.map((reason: string, index: number) => (
            <Text key={index} style={styles.reasoningItem}>
              • {reason}
            </Text>
          ))}

          {fitRecommendation.recommendation.alternatives && (
            <View style={styles.alternatives}>
              <Text style={styles.alternativesTitle}>Other Options:</Text>
              {fitRecommendation.recommendation.alternatives.map((alt: any, index: number) => (
                <View key={index} style={styles.alternativeItem}>
                  <Text style={styles.alternativeSize}>Size {alt.size}</Text>
                  <Text style={styles.alternativeReason}>{alt.reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {selectedImage && (
        <TouchableOpacity
          style={styles.measurementButton}
          onPress={handleGetMeasurements}
        >
          <Text style={styles.measurementButtonText}>Get Body Measurements</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  photoOptions: {
    padding: 20,
    gap: 15,
  },
  photoButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    padding: 20,
  },
  image: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#EEE',
  },
  retakeButton: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tryOnImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  fitInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  fitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  fitText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  confidence: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  recommendationContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  sizeBox: {
    padding: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  sizeLabel: {
    fontSize: 14,
    color: '#666',
  },
  sizeValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginVertical: 10,
  },
  sizeConfidence: {
    fontSize: 14,
    color: '#007AFF',
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  reasoningItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  alternatives: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  alternativeItem: {
    marginBottom: 10,
  },
  alternativeSize: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  alternativeReason: {
    fontSize: 14,
    color: '#666',
  },
  measurementButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#34C759',
    borderRadius: 12,
    alignItems: 'center',
  },
  measurementButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ARTryOnScreen;
