import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Vendor Screens
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorOrdersScreen from '../screens/vendor/VendorOrdersScreen';
import VendorOrderDetailScreen from '../screens/vendor/VendorOrderDetailScreen';
import VendorProductsScreen from '../screens/vendor/VendorProductsScreen';
import VendorProductEditScreen from '../screens/vendor/VendorProductEditScreen';
import VendorAnalyticsScreen from '../screens/vendor/VendorAnalyticsScreen';
import VendorSettingsScreen from '../screens/vendor/VendorSettingsScreen';
import VendorNotificationsScreen from '../screens/vendor/VendorNotificationsScreen';

export type VendorTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Products: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type VendorStackParamList = {
  VendorTabs: undefined;
  OrdersList: undefined;
  OrderDetail: { orderId: string };
  ProductsList: undefined;
  ProductEdit: { productId: string };
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<VendorTabParamList>();
const Stack = createNativeStackNavigator<VendorStackParamList>();

function VendorTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={VendorDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Orders"
        component={VendorOrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen
        name="Products"
        component={VendorProductsScreen}
        options={{ title: 'Products' }}
      />
      <Tab.Screen
        name="Analytics"
        component={VendorAnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="Settings"
        component={VendorSettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function VendorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VendorTabs" component={VendorTabNavigator} />
      <Stack.Screen
        name="OrderDetail"
        component={VendorOrderDetailScreen}
        options={{ headerShown: true, title: 'Order Details' }}
      />
      <Stack.Screen
        name="ProductEdit"
        component={VendorProductEditScreen}
        options={{ headerShown: true, title: 'Edit Product' }}
      />
      <Stack.Screen
        name="Notifications"
        component={VendorNotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
