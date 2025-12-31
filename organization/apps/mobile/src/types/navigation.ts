import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  Payment: { amount: number; currency: string; orderId?: string; items?: any[] };
  OrderDetail: { orderId: string };
  WriteReview: { productId: string; productName?: string; productImage?: string; orderId?: string };
  EditReview: { reviewId: string };
  AIAssistant: undefined;
  ARTryOn: { productId?: string; category?: string };
  Subscription: undefined;
  CreditPackages: undefined;
  Wallet: undefined;
  Search: { query?: string };
  Categories: { categoryId?: string };
};

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Categories: undefined;
  Wishlist: undefined;
  Account: NavigatorScreenParams<AccountStackParamList>;
};

// Account Stack
export type AccountStackParamList = {
  AccountMain: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  TrackOrder: { orderId: string };
  Wishlist: undefined;
  Addresses: undefined;
  Settings: undefined;
  Notifications: undefined;
  MyReviews: undefined;
  ProfileEdit: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type AccountStackScreenProps<T extends keyof AccountStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AccountStackParamList, T>,
  MainTabScreenProps<'Account'>
>;

// Navigation utility type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
