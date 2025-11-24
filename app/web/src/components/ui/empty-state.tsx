import { ReactNode } from 'react';
import { Button } from './button';
import {
  ShoppingCart,
  Package,
  Search,
  FileText,
  Heart,
  AlertCircle,
  Inbox,
  ShoppingBag,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: 'cart' | 'package' | 'search' | 'document' | 'heart' | 'alert' | 'inbox' | 'shopping';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

const iconMap = {
  cart: ShoppingCart,
  package: Package,
  search: Search,
  document: FileText,
  heart: Heart,
  alert: AlertCircle,
  inbox: Inbox,
  shopping: ShoppingBag,
};

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div className="flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

// Specific empty state components for common use cases
export function EmptyCart() {
  return (
    <EmptyState
      icon="cart"
      title="Your cart is empty"
      description="Looks like you haven't added any items to your cart yet. Start shopping to fill it up!"
      action={{
        label: 'Start Shopping',
        onClick: () => (window.location.href = '/products'),
      }}
    />
  );
}

export function EmptyOrders() {
  return (
    <EmptyState
      icon="package"
      title="No orders yet"
      description="You haven't placed any orders yet. Browse our products and make your first purchase!"
      action={{
        label: 'Browse Products',
        onClick: () => (window.location.href = '/products'),
      }}
    />
  );
}

export function EmptySearchResults() {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description="We couldn't find any products matching your search. Try adjusting your filters or search terms."
      action={{
        label: 'Clear Filters',
        onClick: () => window.location.reload(),
      }}
    />
  );
}

export function EmptyWishlist() {
  return (
    <EmptyState
      icon="heart"
      title="Your wishlist is empty"
      description="Save items you love for later by adding them to your wishlist."
      action={{
        label: 'Discover Products',
        onClick: () => (window.location.href = '/products'),
      }}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="inbox"
      title="No notifications"
      description="You're all caught up! Check back later for new notifications."
    />
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <EmptyState
      icon="alert"
      title="Something went wrong"
      description={
        message || 'We encountered an error while loading this content. Please try again.'
      }
      action={{
        label: 'Retry',
        onClick: () => window.location.reload(),
      }}
    />
  );
}
