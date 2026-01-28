'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ProductStatusToggleProps {
  productId: string;
  initialStatus: boolean;
  onStatusChange?: (productId: string, newStatus: boolean) => void;
  disabled?: boolean;
}

export function ProductStatusToggle({
  productId,
  initialStatus,
  onStatusChange,
  disabled = false,
}: ProductStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);

    try {
      // Call API to update product status
      const response = await fetch(`/api/v1/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: checked }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product status');
      }

      setIsActive(checked);

      // Show success toast
      toast.success(
        checked ? 'Product activated successfully' : 'Product deactivated successfully',
        {
          description: checked
            ? 'The product is now visible to customers'
            : 'The product is now hidden from customers',
        }
      );

      // Notify parent component
      if (onStatusChange) {
        onStatusChange(productId, checked);
      }
    } catch (error) {
      // Show error toast
      toast.error('Failed to update product status', {
        description: 'Please try again later or contact support if the issue persists',
      });

      console.error('Error updating product status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={disabled || isLoading}
        aria-label={isActive ? 'Deactivate product' : 'Activate product'}
      />
    </div>
  );
}
