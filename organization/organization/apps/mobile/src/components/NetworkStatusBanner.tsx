import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../hooks/useNetwork';

interface NetworkStatusBannerProps {
  showReconnected?: boolean;
  autoHideDelay?: number;
}

/**
 * NetworkStatusBanner Component
 *
 * Displays a banner at the top of the screen when the user is offline.
 * Shows a "back online" message when connectivity is restored.
 */
export function NetworkStatusBanner({
  showReconnected = true,
  autoHideDelay = 3000,
}: NetworkStatusBannerProps) {
  const insets = useSafeAreaInsets();
  const { isConnected, isOfflineMode, pendingActionsCount } = useNetwork();
  const [wasOffline, setWasOffline] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(false);
  const [isReconnected, setIsReconnected] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (!isConnected || isOfflineMode) {
      setWasOffline(true);
      setShowBanner(true);
      setIsReconnected(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline && showReconnected) {
      setIsReconnected(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      // Hide after delay
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowBanner(false);
          setWasOffline(false);
          setIsReconnected(false);
        });
      }, autoHideDelay);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowBanner(false));
    }
  }, [isConnected, isOfflineMode, wasOffline, showReconnected, slideAnim, autoHideDelay]);

  if (!showBanner && !isOfflineMode) {
    return null;
  }

  const isOffline = !isConnected || isOfflineMode;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: isOffline ? '#f59e0b' : '#10b981',
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'checkmark-circle-outline'}
          size={20}
          color="#fff"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isOffline ? 'You\'re offline' : 'Back online'}
          </Text>
          {isOffline && pendingActionsCount > 0 && (
            <Text style={styles.subtitle}>
              {pendingActionsCount} action{pendingActionsCount > 1 ? 's' : ''} pending sync
            </Text>
          )}
          {isReconnected && (
            <Text style={styles.subtitle}>
              Your connection has been restored
            </Text>
          )}
        </View>
        {isOffline && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {/* Trigger manual reconnect check */}}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  retryButton: {
    padding: 8,
  },
});

export default NetworkStatusBanner;
