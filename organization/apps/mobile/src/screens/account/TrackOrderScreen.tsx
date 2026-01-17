import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { ordersApi } from '../../services/api';
import { AccountStackParamList } from '../../navigation/RootNavigator';

type TrackOrderRouteProp = RouteProp<AccountStackParamList, 'TrackOrder'>;

interface TrackingEvent {
  id: string;
  timestamp: string;
  status: string;
  description: string;
  location?: string;
  completed: boolean;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface TrackingData {
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: string;
  currentStatus: string;
  currentLocation?: Coordinate;
  deliveryLocation: Coordinate;
  route?: Coordinate[];
  events: TrackingEvent[];
}

const mockTrackingData: TrackingData = {
  orderNumber: 'ORD-2024-001234',
  carrier: 'FedEx',
  trackingNumber: '1234567890',
  estimatedDelivery: '2024-01-20',
  currentStatus: 'In Transit',
  currentLocation: { latitude: 40.7128, longitude: -74.0060 },
  deliveryLocation: { latitude: 40.7580, longitude: -73.9855 },
  route: [
    { latitude: 40.7128, longitude: -74.0060 },
    { latitude: 40.7350, longitude: -73.9950 },
    { latitude: 40.7580, longitude: -73.9855 },
  ],
  events: [
    {
      id: '1',
      timestamp: '2024-01-15T09:00:00Z',
      status: 'Order Placed',
      description: 'Your order has been confirmed',
      completed: true,
    },
    {
      id: '2',
      timestamp: '2024-01-16T14:30:00Z',
      status: 'Picked Up',
      description: 'Package picked up by carrier',
      location: 'Warehouse - Brooklyn, NY',
      completed: true,
    },
    {
      id: '3',
      timestamp: '2024-01-17T08:15:00Z',
      status: 'In Transit',
      description: 'Package is on the way to destination',
      location: 'Distribution Center - Manhattan, NY',
      completed: true,
    },
    {
      id: '4',
      timestamp: '2024-01-18T10:00:00Z',
      status: 'Out for Delivery',
      description: 'Package is out for delivery',
      location: 'Local Facility - New York, NY',
      completed: false,
    },
    {
      id: '5',
      timestamp: '2024-01-20T16:00:00Z',
      status: 'Delivered',
      description: 'Package will be delivered',
      completed: false,
    },
  ],
};

export default function TrackOrderScreen() {
  const route = useRoute<TrackOrderRouteProp>();
  const { orderId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const { data: tracking, isLoading, refetch } = useQuery({
    queryKey: ['orderTracking', orderId],
    queryFn: () => ordersApi.trackOrder(orderId),
    refetchInterval: 60000, // Refresh every minute
  });

  const trackingData = tracking?.data || mockTrackingData;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleOpenCarrierWebsite = () => {
    const carrierUrls: Record<string, string> = {
      FedEx: `https://www.fedex.com/fedextrack/?tracknumbers=${trackingData.trackingNumber}`,
      UPS: `https://www.ups.com/track?tracknum=${trackingData.trackingNumber}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingData.trackingNumber}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingData.trackingNumber}`,
    };

    const url = carrierUrls[trackingData.carrier];
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Map View */}
        {showMap && trackingData.currentLocation && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: trackingData.currentLocation.latitude,
                longitude: trackingData.currentLocation.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              {/* Current Location */}
              <Marker
                coordinate={trackingData.currentLocation}
                title="Current Location"
                description="Your package is here"
              >
                <View style={styles.currentMarker}>
                  <Ionicons name="cube" size={20} color="#fff" />
                </View>
              </Marker>

              {/* Delivery Location */}
              <Marker
                coordinate={trackingData.deliveryLocation}
                title="Delivery Address"
                description="Your package will be delivered here"
              >
                <View style={styles.destinationMarker}>
                  <Ionicons name="home" size={20} color="#fff" />
                </View>
              </Marker>

              {/* Route */}
              {trackingData.route && (
                <Polyline
                  coordinates={trackingData.route}
                  strokeColor="#6366f1"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}
            </MapView>
            <TouchableOpacity
              style={styles.mapToggle}
              onPress={() => setShowMap(!showMap)}
            >
              <Ionicons name="close" size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>
        )}

        {!showMap && (
          <TouchableOpacity
            style={styles.showMapButton}
            onPress={() => setShowMap(true)}
          >
            <Ionicons name="map-outline" size={20} color="#6366f1" />
            <Text style={styles.showMapText}>Show Map</Text>
          </TouchableOpacity>
        )}

        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={styles.statusIcon}>
            <Ionicons name="cube" size={32} color="#6366f1" />
          </View>
          <Text style={styles.statusTitle}>{trackingData.currentStatus}</Text>
          <Text style={styles.orderNumber}>{trackingData.orderNumber}</Text>
          <View style={styles.estimatedDelivery}>
            <Ionicons name="calendar-outline" size={16} color="#10b981" />
            <Text style={styles.estimatedDeliveryText}>
              Estimated delivery: {new Date(trackingData.estimatedDelivery).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Carrier Info */}
        <View style={styles.carrierSection}>
          <View style={styles.carrierInfo}>
            <View style={styles.carrierIcon}>
              <Ionicons name="business-outline" size={20} color="#6366f1" />
            </View>
            <View style={styles.carrierDetails}>
              <Text style={styles.carrierLabel}>Carrier</Text>
              <Text style={styles.carrierName}>{trackingData.carrier}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.trackingButton}
            onPress={handleOpenCarrierWebsite}
          >
            <Ionicons name="open-outline" size={16} color="#6366f1" />
            <Text style={styles.trackingButtonText}>
              Track on {trackingData.carrier}
            </Text>
          </TouchableOpacity>
          <View style={styles.trackingNumber}>
            <Text style={styles.trackingNumberLabel}>Tracking Number</Text>
            <Text style={styles.trackingNumberValue}>{trackingData.trackingNumber}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Tracking History</Text>
          <View style={styles.timeline}>
            {trackingData.events.map((event: TrackingEvent, index: number) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineIndicator}>
                  <View
                    style={[
                      styles.timelineDot,
                      event.completed && styles.timelineDotCompleted,
                    ]}
                  >
                    {event.completed && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </View>
                  {index < trackingData.events.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        event.completed && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineStatus,
                      !event.completed && styles.timelineStatusPending,
                    ]}
                  >
                    {event.status}
                  </Text>
                  <Text style={styles.timelineDescription}>{event.description}</Text>
                  {event.location && (
                    <View style={styles.timelineLocation}>
                      <Ionicons name="location-outline" size={12} color="#9ca3af" />
                      <Text style={styles.timelineLocationText}>{event.location}</Text>
                    </View>
                  )}
                  <Text style={styles.timelineTimestamp}>
                    {formatTimestamp(event.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubbles-outline" size={20} color="#6366f1" />
            <Text style={styles.actionButtonText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color="#6366f1" />
            <Text style={styles.actionButtonText}>Share Tracking</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  mapContainer: {
    height: 250,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  currentMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  showMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  showMapText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  statusHeader: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  estimatedDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  estimatedDeliveryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  carrierSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  carrierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  carrierDetails: {
    flex: 1,
  },
  carrierLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  carrierName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  trackingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  trackingNumber: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  trackingNumberLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  trackingNumberValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  timelineSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  timeline: {
    marginLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#10b981',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  timelineStatusPending: {
    color: '#9ca3af',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  timelineLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  timelineLocationText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  timelineTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionsSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  bottomPadding: {
    height: 24,
  },
});
