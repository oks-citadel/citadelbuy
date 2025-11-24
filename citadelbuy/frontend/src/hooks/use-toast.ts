// Stub toast hook for compatibility
// TODO: Implement proper toast notifications system

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const toast = (props: ToastProps) => {
    // Simple console implementation
    if (props.variant === 'destructive') {
      console.error(`${props.title}: ${props.description}`);
      // Optionally show browser alert for errors
      if (props.description) {
        alert(`${props.title || 'Error'}: ${props.description}`);
      }
    } else {
      console.log(`${props.title}: ${props.description}`);
    }
  };

  return { toast };
}
