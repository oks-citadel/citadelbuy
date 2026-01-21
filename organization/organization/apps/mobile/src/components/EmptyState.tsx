import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IoniconsName;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * EmptyState Component
 *
 * A reusable component for displaying empty states in the mobile app.
 * Use this when:
 * - A list has no items
 * - Search returns no results
 * - First-time user experience
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  style,
  size = 'md',
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      iconSize: 48,
      iconContainer: 80,
      title: 16,
      description: 13,
      padding: 16,
    },
    md: {
      iconSize: 64,
      iconContainer: 100,
      title: 18,
      description: 14,
      padding: 24,
    },
    lg: {
      iconSize: 80,
      iconContainer: 120,
      title: 20,
      description: 15,
      padding: 32,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[styles.container, { padding: currentSize.padding }, style]}>
      <View
        style={[
          styles.iconContainer,
          {
            width: currentSize.iconContainer,
            height: currentSize.iconContainer,
            borderRadius: currentSize.iconContainer / 2,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={currentSize.iconSize}
          color="#d1d5db"
        />
      </View>

      <Text style={[styles.title, { fontSize: currentSize.title }]}>
        {title}
      </Text>

      <Text style={[styles.description, { fontSize: currentSize.description }]}>
        {description}
      </Text>

      {action && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{action.label}</Text>
        </TouchableOpacity>
      )}

      {secondaryAction && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={secondaryAction.onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>{secondaryAction.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EmptyState;
