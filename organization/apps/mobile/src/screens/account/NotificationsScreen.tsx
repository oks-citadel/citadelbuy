import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  category: string;
}

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'orders',
      title: 'Order Updates',
      description: 'Get notified about order status changes, shipping updates, and deliveries',
      enabled: true,
      category: 'Shopping',
    },
    {
      id: 'promotions',
      title: 'Promotions & Deals',
      description: 'Receive notifications about sales, discounts, and special offers',
      enabled: true,
      category: 'Shopping',
    },
    {
      id: 'price_drops',
      title: 'Price Drops',
      description: 'Get alerts when items in your wishlist go on sale',
      enabled: true,
      category: 'Shopping',
    },
    {
      id: 'back_in_stock',
      title: 'Back in Stock',
      description: 'Be notified when out-of-stock items become available',
      enabled: true,
      category: 'Shopping',
    },
    {
      id: 'recommendations',
      title: 'Personalized Recommendations',
      description: 'Discover new products based on your preferences',
      enabled: false,
      category: 'AI Features',
    },
    {
      id: 'ai_insights',
      title: 'AI Shopping Insights',
      description: 'Get AI-powered shopping tips and suggestions',
      enabled: false,
      category: 'AI Features',
    },
    {
      id: 'reviews',
      title: 'Review Reminders',
      description: 'Reminders to review products you\'ve purchased',
      enabled: true,
      category: 'Engagement',
    },
    {
      id: 'loyalty',
      title: 'Loyalty & Rewards',
      description: 'Updates about your points, rewards, and tier status',
      enabled: true,
      category: 'Engagement',
    },
    {
      id: 'security',
      title: 'Security Alerts',
      description: 'Important notifications about your account security',
      enabled: true,
      category: 'Account',
    },
    {
      id: 'account',
      title: 'Account Updates',
      description: 'Information about profile changes and account activity',
      enabled: true,
      category: 'Account',
    },
  ]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const handleToggle = (id: string) => {
    setSettings(
      settings.map((setting) =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive push notifications.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Notifications.getPermissionsAsync() },
          ]
        );
        return;
      }
    }
    setPushEnabled(value);
  };

  const handleEnableAll = () => {
    setSettings(settings.map((s) => ({ ...s, enabled: true })));
    Alert.alert('Success', 'All notifications have been enabled');
  };

  const handleDisableAll = () => {
    Alert.alert(
      'Disable All Notifications',
      'Are you sure you want to disable all notifications? You may miss important updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable All',
          style: 'destructive',
          onPress: () => {
            setSettings(
              settings.map((s) =>
                s.id === 'security' ? s : { ...s, enabled: false }
              )
            );
          },
        },
      ]
    );
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Controls */}
        <View style={styles.masterControls}>
          <View style={styles.masterControlItem}>
            <View style={styles.masterControlInfo}>
              <Ionicons name="notifications" size={24} color="#7c3aed" />
              <View style={styles.masterControlText}>
                <Text style={styles.masterControlTitle}>Push Notifications</Text>
                <Text style={styles.masterControlDescription}>
                  Receive notifications on your device
                </Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              thumbColor={pushEnabled ? '#7c3aed' : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.masterControlItem}>
            <View style={styles.masterControlInfo}>
              <Ionicons name="mail" size={24} color="#7c3aed" />
              <View style={styles.masterControlText}>
                <Text style={styles.masterControlTitle}>Email Notifications</Text>
                <Text style={styles.masterControlDescription}>
                  Receive updates via email
                </Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              thumbColor={emailEnabled ? '#7c3aed' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleEnableAll}>
            <Text style={styles.quickActionText}>Enable All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, styles.quickActionSecondary]}
            onPress={handleDisableAll}
          >
            <Text style={styles.quickActionTextSecondary}>Disable All</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Categories */}
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <View key={category} style={styles.category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {categorySettings.map((setting, index) => (
              <View key={setting.id}>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>{setting.title}</Text>
                    <Text style={styles.settingDescription}>
                      {setting.description}
                    </Text>
                  </View>
                  <Switch
                    value={setting.enabled}
                    onValueChange={() => handleToggle(setting.id)}
                    trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
                    thumbColor={setting.enabled ? '#7c3aed' : '#9ca3af'}
                    disabled={!pushEnabled || setting.id === 'security'}
                  />
                </View>
                {index < categorySettings.length - 1 && (
                  <View style={styles.settingDivider} />
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={20} color="#6b7280" />
          <Text style={styles.infoNoteText}>
            Security alerts cannot be disabled for your account protection.
            Notification preferences are synced across your devices.
          </Text>
        </View>
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
    padding: 16,
    paddingBottom: 32,
  },
  masterControls: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  masterControlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterControlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterControlText: {
    marginLeft: 12,
    flex: 1,
  },
  masterControlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  masterControlDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  quickActionSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 0,
    marginLeft: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quickActionTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  category: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 16,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginLeft: 8,
  },
});
