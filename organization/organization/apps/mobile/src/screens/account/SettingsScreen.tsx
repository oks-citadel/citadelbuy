import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/auth-store';
import { AccountStackParamList } from '../../navigation/RootNavigator';

type SettingsScreenNavigationProp = NativeStackNavigationProp<AccountStackParamList, 'Settings'>;

interface SettingItem {
  id: string;
  icon: string;
  label: string;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  sublabel?: string;
}

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const renderToggleSetting = (
    icon: string,
    label: string,
    value: boolean,
    onValueChange: (val: boolean) => void,
    sublabel?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color="#6366f1" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sublabel && <Text style={styles.settingSublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e5e7eb', true: '#6366f1' }}
        thumbColor="#fff"
      />
    </View>
  );

  const renderNavigationSetting = (icon: string, label: string, sublabel?: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color="#6366f1" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sublabel && <Text style={styles.settingSublabel}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.sectionContent}>
          {renderToggleSetting(
            'notifications-outline',
            'Push Notifications',
            notifications,
            setNotifications,
            'Get notified about important updates'
          )}
          {renderToggleSetting(
            'mail-outline',
            'Email Updates',
            emailUpdates,
            setEmailUpdates,
            'Receive updates via email'
          )}
          {renderToggleSetting(
            'cube-outline',
            'Order Updates',
            orderUpdates,
            setOrderUpdates,
            'Get notified about order status'
          )}
          {renderToggleSetting(
            'pricetag-outline',
            'Promotions & Deals',
            promotions,
            setPromotions,
            'Receive promotional notifications'
          )}
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.sectionContent}>
          {renderToggleSetting(
            'moon-outline',
            'Dark Mode',
            darkMode,
            setDarkMode,
            'Use dark theme'
          )}
          {renderNavigationSetting('language-outline', 'Language', 'English')}
          {renderNavigationSetting('text-outline', 'Font Size', 'Medium')}
        </View>
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.sectionContent}>
          {renderToggleSetting(
            'finger-print-outline',
            'Biometric Login',
            biometric,
            setBiometric,
            'Use Face ID or fingerprint'
          )}
          {renderNavigationSetting('lock-closed-outline', 'Change Password')}
          {renderNavigationSetting('shield-checkmark-outline', 'Two-Factor Auth', 'Enabled')}
          {renderNavigationSetting(
            'phone-portrait-outline',
            'Active Sessions',
            'Manage devices logged into your account',
            () => navigation.navigate('SessionManagement')
          )}
          {renderNavigationSetting('key-outline', 'Security Keys')}
        </View>
      </View>

      {/* Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.sectionContent}>
          {renderNavigationSetting('eye-outline', 'Privacy Settings')}
          {renderNavigationSetting('analytics-outline', 'Data & Analytics')}
          {renderNavigationSetting('download-outline', 'Download My Data')}
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionContent}>
          {renderNavigationSetting('help-circle-outline', 'Help Center')}
          {renderNavigationSetting('chatbubbles-outline', 'Contact Support')}
          {renderNavigationSetting('bug-outline', 'Report a Bug')}
          {renderNavigationSetting('star-outline', 'Rate the App')}
        </View>
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.sectionContent}>
          {renderNavigationSetting('document-text-outline', 'Terms of Service')}
          {renderNavigationSetting('shield-outline', 'Privacy Policy')}
          {renderNavigationSetting('information-circle-outline', 'Licenses')}
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <TouchableOpacity style={styles.settingItem} onPress={() => logout()}>
            <View style={[styles.settingIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <View style={[styles.settingIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Delete Account</Text>
              <Text style={styles.settingSublabel}>Permanently delete your account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>Broxiva</Text>
        <Text style={styles.appVersion}>Version 1.0.0 (Build 1)</Text>
        <Text style={styles.copyright}>2024 Broxiva. All rights reserved.</Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#fff',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingSublabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bottomPadding: {
    height: 40,
  },
});
