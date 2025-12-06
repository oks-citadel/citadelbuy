/**
 * Local app models and state types
 */

// App state types
export interface AppState {
  isOnline: boolean;
  isInitialized: boolean;
  theme: 'light' | 'dark' | 'system';
}

// Filter and sort types
export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  tags?: string[];
  vendorId?: string;
}

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'popularity'
  | 'name_asc'
  | 'name_desc';

export interface ProductSearchParams {
  query?: string;
  filters?: ProductFilters;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AddressFormData {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface ReviewFormData {
  rating: number;
  title?: string;
  content: string;
  images?: string[];
}

export interface CheckoutFormData {
  shippingAddressId: string;
  billingAddressId?: string;
  useSameAsBilling: boolean;
  paymentMethod: string;
  savePaymentMethod?: boolean;
  notes?: string;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ModalState {
  isVisible: boolean;
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

// Toast notification types
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
