import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth-store';

// Test credentials for development - only shown in __DEV__ mode
const TEST_ACCOUNTS = [
  { email: 'admin@citadelbuy.com', password: 'password123', role: 'Admin', color: '#ef4444' },
  { email: 'vendor1@citadelbuy.com', password: 'password123', role: 'Vendor', color: '#6366f1' },
  { email: 'customer@citadelbuy.com', password: 'password123', role: 'Customer', color: '#22c55e' },
];

export default function TestCredentials() {
  const { login, isLoading } = useAuthStore();
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  const handleQuickLogin = async (testEmail: string, testPassword: string) => {
    try {
      await login(testEmail, testPassword);
    } catch (err) {
      Alert.alert('Login Failed', 'Make sure the database is seeded with test data.');
    }
  };

  return (
    <View style={styles.devSection}>
      <TouchableOpacity
        style={styles.devToggle}
        onPress={() => setShowTestAccounts(!showTestAccounts)}
      >
        <Ionicons name="code-slash" size={16} color="#f97316" />
        <Text style={styles.devToggleText}>
          {showTestAccounts ? 'Hide Test Accounts' : 'Show Test Accounts'}
        </Text>
        <Ionicons
          name={showTestAccounts ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#f97316"
        />
      </TouchableOpacity>

      {showTestAccounts && (
        <View style={styles.testAccountsContainer}>
          <Text style={styles.testAccountsTitle}>Quick Login (Dev Mode)</Text>
          <Text style={styles.testAccountsHint}>
            Run npx prisma db seed to populate test accounts
          </Text>
          {TEST_ACCOUNTS.map((account) => (
            <TouchableOpacity
              key={account.email}
              style={styles.testAccountButton}
              onPress={() => handleQuickLogin(account.email, account.password)}
              disabled={isLoading}
            >
              <View style={[styles.testAccountBadge, { backgroundColor: account.color }]}>
                <Text style={styles.testAccountBadgeText}>{account.role}</Text>
              </View>
              <View style={styles.testAccountInfo}>
                <Text style={styles.testAccountEmail}>{account.email}</Text>
                <Text style={styles.testAccountPassword}>Password: {account.password}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  devSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
    paddingTop: 16,
  },
  devToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderStyle: 'dashed',
  },
  devToggleText: {
    color: '#f97316',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  testAccountsContainer: {
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  testAccountsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  testAccountsHint: {
    fontSize: 11,
    color: '#a16207',
    marginBottom: 12,
  },
  testAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  testAccountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  testAccountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  testAccountInfo: {
    flex: 1,
  },
  testAccountEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  testAccountPassword: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});
