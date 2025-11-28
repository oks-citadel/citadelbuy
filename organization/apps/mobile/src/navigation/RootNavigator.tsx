import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth-store';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import HomeScreen from '../screens/shop/HomeScreen';
import SearchScreen from '../screens/shop/SearchScreen';
import CategoriesScreen from '../screens/shop/CategoriesScreen';
import ProductDetailScreen from '../screens/shop/ProductDetailScreen';
import CartScreen from '../screens/checkout/CartScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';

// Account Screens
import AccountScreen from '../screens/account/AccountScreen';
import OrdersScreen from '../screens/account/OrdersScreen';
import OrderDetailScreen from '../screens/account/OrderDetailScreen';
import WishlistScreen from '../screens/account/WishlistScreen';
import AddressesScreen from '../screens/account/AddressesScreen';
import SettingsScreen from '../screens/account/SettingsScreen';
import NotificationsScreen from '../screens/account/NotificationsScreen';

// Review Screens
import WriteReviewScreen from '../screens/reviews/WriteReviewScreen';
import MyReviewsScreen from '../screens/reviews/MyReviewsScreen';

// AI Features
import AIAssistantScreen from '../screens/ai-features/AIAssistantScreen';

// AR Features
import ARTryOnScreen from '../screens/ar/ARTryOnScreen';

// Payment Screens
import PaymentScreen from '../screens/payments/PaymentScreen';
import SubscriptionScreen from '../screens/payments/SubscriptionScreen';
import WalletScreen from '../screens/payments/WalletScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  Payment: { amount: number; currency: string; orderId?: string; items?: any[] };
  OrderDetail: { orderId: string };
  AIAssistant: undefined;
  ARTryOn: { productId?: string; category?: string };
  WriteReview: { productId: string; productName: string; productImage: string };
  Subscription: undefined;
  Wallet: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Categories: undefined;
  Wishlist: undefined;
  Account: undefined;
};

export type AccountStackParamList = {
  AccountMain: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Wishlist: undefined;
  Addresses: undefined;
  Settings: undefined;
  Notifications: undefined;
  MyReviews: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AccountNavigator() {
  return (
    <AccountStack.Navigator>
      <AccountStack.Screen
        name="AccountMain"
        component={AccountScreen}
        options={{ title: 'My Account' }}
      />
      <AccountStack.Screen name="Orders" component={OrdersScreen} />
      <AccountStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
      <AccountStack.Screen name="Wishlist" component={WishlistScreen} />
      <AccountStack.Screen name="Addresses" component={AddressesScreen} />
      <AccountStack.Screen name="Settings" component={SettingsScreen} />
      <AccountStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <AccountStack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{ title: 'My Reviews' }}
      />
    </AccountStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Wishlist') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Account" component={AccountNavigator} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ headerShown: true, title: 'Product' }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{ headerShown: true, title: 'Cart' }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{ headerShown: true, title: 'Checkout' }}
          />
          <Stack.Screen
            name="AIAssistant"
            component={AIAssistantScreen}
            options={{ headerShown: true, title: 'AI Shopping Assistant' }}
          />
          <Stack.Screen
            name="ARTryOn"
            component={ARTryOnScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="WriteReview"
            component={WriteReviewScreen}
            options={{ headerShown: true, title: 'Write Review' }}
          />
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{ headerShown: true, title: 'Payment' }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{ headerShown: true, title: 'Subscription Plans' }}
          />
          <Stack.Screen
            name="Wallet"
            component={WalletScreen}
            options={{ headerShown: true, title: 'Wallet' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
