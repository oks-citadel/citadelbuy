import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth-store';
import { api } from '../../services/api';

export interface Session {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browser?: string;
  operatingSystem?: string;
  ipAddress: string;
  location?: {
    city?: string;
    country?: string;
  };
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

const getDeviceIcon = (deviceType: Session['deviceType']): string => {
  switch (deviceType) {
    case 'mobile':
      return 'phone-portrait-outline';
    case 'tablet':
      return 'tablet-portrait-outline';
    case 'desktop':
      return 'desktop-outline';
    default:
      return 'hardware-chip-outline';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
};

const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function SessionManagementScreen() {
  const { revokeSession, revokeAllOtherSessions } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get('/auth/sessions');
      setSessions(response.data.sessions || response.data);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load sessions'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSessions();
  };

  const handleRevokeSession = (session: Session) => {
    Alert.alert(
      'End Session',
      `Are you sure you want to end the session on "${session.deviceName}"? This device will be signed out immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setRevokingSessionId(session.id);
            try {
              await revokeSession(session.id);
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
              Alert.alert('Success', 'Session has been ended.');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to end session'
              );
            } finally {
              setRevokingSessionId(null);
            }
          },
        },
      ]
    );
  };

  const handleRevokeAllOtherSessions = () => {
    const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

    if (otherSessionsCount === 0) {
      Alert.alert('No Other Sessions', 'You only have this current session active.');
      return;
    }

    Alert.alert(
      'End All Other Sessions',
      `Are you sure you want to end ${otherSessionsCount} other session${otherSessionsCount !== 1 ? 's' : ''}? All other devices will be signed out immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End All Sessions',
          style: 'destructive',
          onPress: async () => {
            setIsRevokingAll(true);
            try {
              await revokeAllOtherSessions();
              setSessions((prev) => prev.filter((s) => s.isCurrent));
              Alert.alert('Success', 'All other sessions have been ended.');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to end sessions'
              );
            } finally {
              setIsRevokingAll(false);
            }
          },
        },
      ]
    );
  };

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  const renderSessionItem = (session: Session) => {
    const isRevoking = revokingSessionId === session.id;
    const locationText = session.location?.city && session.location?.country
      ? `${session.location.city}, ${session.location.country}`
      : session.location?.country || session.ipAddress;

    return (
      <View
        key={session.id}
        style={[
          styles.sessionCard,
          session.isCurrent && styles.currentSessionCard,
        ]}
      >
        <View style={styles.sessionHeader}>
          <View
            style={[
              styles.deviceIconContainer,
              session.isCurrent && styles.currentDeviceIcon,
            ]}
          >
            <Ionicons
              name={getDeviceIcon(session.deviceType) as any}
              size={24}
              color={session.isCurrent ? '#fff' : '#6366f1'}
            />
          </View>
          <View style={styles.sessionInfo}>
            <View style={styles.sessionTitleRow}>
              <Text style={styles.deviceName}>{session.deviceName}</Text>
              {session.isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </View>
            {session.browser && session.operatingSystem && (
              <Text style={styles.browserInfo}>
                {session.browser} on {session.operatingSystem}
              </Text>
            )}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.locationText}>{locationText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Last active</Text>
              <Text style={styles.detailValue}>
                {session.isCurrent ? 'Now' : formatDate(session.lastActiveAt)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Started</Text>
              <Text style={styles.detailValue}>
                {formatFullDate(session.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {!session.isCurrent && (
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => handleRevokeSession(session)}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={styles.revokeButtonText}>End Session</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
          />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#6366f1" />
          <Text style={styles.infoBannerText}>
            Manage your active sessions across all devices. End any session you
            don't recognize to keep your account secure.
          </Text>
        </View>

        {/* Current Session */}
        {currentSession && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Session</Text>
            {renderSessionItem(currentSession)}
          </View>
        )}

        {/* Other Sessions */}
        {otherSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Other Sessions</Text>
              <Text style={styles.sessionCount}>
                {otherSessions.length} active
              </Text>
            </View>
            {otherSessions
              .sort(
                (a, b) =>
                  new Date(b.lastActiveAt).getTime() -
                  new Date(a.lastActiveAt).getTime()
              )
              .map(renderSessionItem)}
          </View>
        )}

        {/* No Other Sessions */}
        {otherSessions.length === 0 && currentSession && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>
            <Text style={styles.emptyTitle}>Only This Device</Text>
            <Text style={styles.emptyText}>
              You're only signed in on this device. No other active sessions.
            </Text>
          </View>
        )}

        {/* Revoke All Sessions Button */}
        {otherSessions.length > 0 && (
          <TouchableOpacity
            style={styles.revokeAllButton}
            onPress={handleRevokeAllOtherSessions}
            disabled={isRevokingAll}
          >
            {isRevokingAll ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.revokeAllButtonText}>
                  End All Other Sessions
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Security Tips */}
        <View style={styles.securityTips}>
          <Text style={styles.securityTipsTitle}>Security Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>
              Regularly review your active sessions
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>
              End sessions on devices you no longer use
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>
              If you see unfamiliar sessions, change your password immediately
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4338ca',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sessionCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentSessionCard: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentDeviceIcon: {
    backgroundColor: '#6366f1',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  browserInfo: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  sessionDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  revokeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  revokeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  revokeAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  securityTips: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  securityTipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});
