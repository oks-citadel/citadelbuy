// UI Components for CitadelBuy platform
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export utilities
export { clsx } from 'clsx';
export { twMerge } from 'tailwind-merge';
export { cva, type VariantProps } from 'class-variance-authority';

// Placeholder exports for components
// These will be implemented as needed
export const Button = () => null;
export const Input = () => null;
export const Card = () => null;
export const Badge = () => null;
export const Avatar = () => null;
export const Skeleton = () => null;
export const Spinner = () => null;
export const Modal = () => null;
export const Toast = () => null;
export const Tooltip = () => null;
