import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/auth-store';
import { AccountStackParamList } from '../../navigation/RootNavigator';

type AccountScreenNavigationProp = NativeStackNavigationProp<AccountStackParamList, 'AccountMain'>;

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  sublabel?: string;
  route?: keyof AccountStackParamList;
  badge?: string;
  color?: string;
}

const menuItems: MenuItem[] = [
  { id: '1', icon: 'cube-outline', label: 'My Orders', sublabel: 'View order history', route: 'Orders' },
  { id: '2', icon: 'heart-outline', label: 'Wishlist', sublabel: '12 items saved', route: 'Wishlist', badge: '12' },
  { id: '3', icon: 'location-outline', label: 'Addresses', sublabel: 'Manage delivery addresses', route: 'Addresses' },
  { id: '4', icon: 'card-outline', label: 'Payment Methods', sublabel: 'Manage cards & wallets' },
  { id: '5', icon: 'notifications-outline', label: 'Notifications', sublabel: 'Manage preferences' },
  { id: '6', icon: 'settings-outline', label: 'Settings', sublabel: 'App preferences', route: 'Settings' },
];

const supportItems: MenuItem[] = [
  { id: 's1', icon: 'help-circle-outline', label: 'Help Center', sublabel: 'FAQs & support' },
  { id: 's2', icon: 'chatbubbles-outline', label: 'Contact Us', sublabel: 'Chat or email' },
  { id: 's3', icon: 'document-text-outline', label: 'Terms & Policies', sublabel: 'Legal information' },
];

export default function AccountScreen() {
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => item.route && navigation.navigate(item.route as any)}
    >
      <View style={[styles.menuIcon, item.color && { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color || '#6366f1'} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{item.label}</Text>
        {item.sublabel && <Text style={styles.menuSublabel}>{item.sublabel}</Text>}
      </View>
      {item.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileSection}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'guest@example.com'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Membership Card */}
          <View style={styles.membershipCard}>
            <View style={styles.membershipInfo}>
              <Text style={styles.membershipTitle}>Gold Member</Text>
              <Text style={styles.membershipPoints}>2,450 points</Text>
            </View>
            <TouchableOpacity style={styles.membershipButton}>
              <Text style={styles.membershipButtonText}>View Benefits</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="wallet-outline" size={24} color="#6366f1" />
            </View>
            <Text style={styles.quickLabel}>Wallet</Text>
            <Text style={styles.quickValue}>$120.00</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="gift-outline" size={24} color="#ef4444" />
            </View>
            <Text style={styles.quickLabel}>Coupons</Text>
            <Text style={styles.quickValue}>5 active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="star-outline" size={24} color="#10b981" />
            </View>
            <Text style={styles.quickLabel}>Reviews</Text>
            <Text style={styles.quickValue}>12 given</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuContainer}>
            {menuItems.map(renderMenuItem)}
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuContainer}>
            {supportItems.map(renderMenuItem)}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>

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
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  membershipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  membershipInfo: {
    flex: 1,
  },
  membershipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 4,
  },
  membershipPoints: {
    fontSize: 14,
    color: '#9ca3af',
  },
  membershipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  membershipButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  quickValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  menuSublabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
