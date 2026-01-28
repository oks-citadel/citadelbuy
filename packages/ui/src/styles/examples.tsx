/**
 * Broxiva Design System - Usage Examples
 *
 * This file contains practical examples of how to use the Broxiva design system
 * in React components with both CSS-in-JS and Tailwind CSS approaches.
 */

import React from 'react';

// ============================================
// EXAMPLE 1: Premium Button Component
// ============================================

/**
 * Using CSS Custom Properties (Recommended for consistency)
 */
export const PremiumButton: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}> = ({ children, variant = 'primary', size = 'md', onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`brx-btn brx-btn-${variant} brx-btn-${size}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--brx-spacing-2)',
        padding:
          size === 'sm'
            ? 'var(--brx-spacing-2) var(--brx-spacing-4)'
            : size === 'lg'
            ? 'var(--brx-spacing-4) var(--brx-spacing-8)'
            : 'var(--brx-spacing-3) var(--brx-spacing-6)',
        borderRadius: 'var(--brx-radius-lg)',
        fontSize: size === 'sm' ? 'var(--brx-text-sm)' : size === 'lg' ? 'var(--brx-text-lg)' : 'var(--brx-text-base)',
        fontWeight: 'var(--brx-font-semibold)',
        backgroundColor: variant === 'primary' ? 'var(--brx-color-primary)' : 'var(--brx-color-secondary)',
        color: 'var(--brx-text-inverse)',
        border: 'none',
        cursor: 'pointer',
        transition: 'all var(--brx-duration-fast) var(--brx-ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow =
          variant === 'primary' ? 'var(--brx-shadow-primary)' : 'var(--brx-shadow-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--brx-shadow-md)';
      }}
    >
      {children}
    </button>
  );
};

/**
 * Using Tailwind CSS with Broxiva tokens
 */
export const TailwindButton: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}> = ({ children, variant = 'primary' }) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-fast ease-out hover:-translate-y-0.5';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-900 hover:shadow-primary',
    secondary: 'bg-secondary text-white hover:bg-secondary-600 hover:shadow-secondary',
  };

  return <button className={`${baseClasses} ${variantClasses[variant]}`}>{children}</button>;
};

// ============================================
// EXAMPLE 2: Premium Card Component
// ============================================

export const PremiumCard: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'premium';
  hoverable?: boolean;
}> = ({ children, variant = 'default', hoverable = true }) => {
  const getStyles = () => {
    const baseStyles = {
      borderRadius: 'var(--brx-radius-2xl)',
      padding: 'var(--brx-spacing-6)',
      transition: 'all var(--brx-duration-normal) var(--brx-ease-out)',
    };

    switch (variant) {
      case 'glass':
        return {
          ...baseStyles,
          background: 'var(--brx-bg-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'var(--brx-shadow-glass)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        };
      case 'premium':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, var(--brx-color-primary-50) 0%, var(--brx-bg-primary) 100%)',
          border: '1px solid var(--brx-color-primary-100)',
          boxShadow: 'var(--brx-shadow-md)',
        };
      default:
        return {
          ...baseStyles,
          background: 'var(--brx-bg-primary)',
          boxShadow: 'var(--brx-shadow-md)',
        };
    }
  };

  return (
    <div
      style={getStyles()}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = 'var(--brx-shadow-lg)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = variant === 'glass' ? 'var(--brx-shadow-glass)' : 'var(--brx-shadow-md)';
        }
      }}
    >
      {children}
    </div>
  );
};

// ============================================
// EXAMPLE 3: Typography Components
// ============================================

export const Heading: React.FC<{
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  gradient?: boolean;
}> = ({ level, children, gradient = false }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const styles: React.CSSProperties = {
    fontFamily: 'var(--brx-font-display)',
    fontWeight: level <= 2 ? 'var(--brx-font-black)' : 'var(--brx-font-bold)',
    color: 'var(--brx-text-primary)',
    marginBottom: 'var(--brx-spacing-4)',
    ...(gradient && {
      background: 'linear-gradient(135deg, var(--brx-color-primary-600) 0%, var(--brx-color-secondary-500) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }),
  };

  return <Tag style={styles}>{children}</Tag>;
};

export const BodyText: React.FC<{
  children: React.ReactNode;
  size?: 'sm' | 'base' | 'lg';
  variant?: 'primary' | 'secondary' | 'tertiary';
}> = ({ children, size = 'base', variant = 'secondary' }) => {
  const colorMap = {
    primary: 'var(--brx-text-primary)',
    secondary: 'var(--brx-text-secondary)',
    tertiary: 'var(--brx-text-tertiary)',
  };

  const sizeMap = {
    sm: 'var(--brx-text-sm)',
    base: 'var(--brx-text-base)',
    lg: 'var(--brx-text-lg)',
  };

  return (
    <p
      style={{
        fontFamily: 'var(--brx-font-sans)',
        fontSize: sizeMap[size],
        lineHeight: '1.75',
        color: colorMap[variant],
        marginBottom: 'var(--brx-spacing-4)',
      }}
    >
      {children}
    </p>
  );
};

// ============================================
// EXAMPLE 4: Loading Skeleton
// ============================================

export const Skeleton: React.FC<{
  width?: string;
  height?: string;
  borderRadius?: string;
}> = ({ width = '100%', height = '1rem', borderRadius = 'var(--brx-radius)' }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          'linear-gradient(90deg, var(--brx-bg-secondary) 25%, var(--brx-bg-tertiary) 50%, var(--brx-bg-secondary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'brx-shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
};

// ============================================
// EXAMPLE 5: Badge Component
// ============================================

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}> = ({ children, variant = 'primary', size = 'md' }) => {
  const variantStyles = {
    primary: {
      background: 'var(--brx-color-primary-100)',
      color: 'var(--brx-color-primary-800)',
    },
    secondary: {
      background: 'var(--brx-color-secondary-100)',
      color: 'var(--brx-color-secondary-800)',
    },
    success: {
      background: 'var(--brx-color-success-light)',
      color: 'var(--brx-color-success-dark)',
    },
    warning: {
      background: 'var(--brx-color-warning-light)',
      color: 'var(--brx-color-warning-dark)',
    },
    error: {
      background: 'var(--brx-color-error-light)',
      color: 'var(--brx-color-error-dark)',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? 'var(--brx-spacing-1) var(--brx-spacing-2)' : 'var(--brx-spacing-2) var(--brx-spacing-3)',
        borderRadius: 'var(--brx-radius-full)',
        fontSize: size === 'sm' ? 'var(--brx-text-xs)' : 'var(--brx-text-sm)',
        fontWeight: 'var(--brx-font-semibold)',
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  );
};

// ============================================
// EXAMPLE 6: Input Component
// ============================================

export const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    helperText?: string;
  }
> = ({ label, error, helperText, ...props }) => {
  return (
    <div style={{ marginBottom: 'var(--brx-spacing-4)' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 'var(--brx-text-sm)',
            fontWeight: 'var(--brx-font-medium)',
            color: 'var(--brx-text-primary)',
            marginBottom: 'var(--brx-spacing-2)',
          }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: '100%',
          padding: 'var(--brx-spacing-3) var(--brx-spacing-4)',
          border: `1px solid ${error ? 'var(--brx-border-error)' : 'var(--brx-border)'}`,
          borderRadius: 'var(--brx-radius-lg)',
          backgroundColor: 'var(--brx-bg-primary)',
          color: 'var(--brx-text-primary)',
          fontSize: 'var(--brx-text-base)',
          transition: 'all var(--brx-duration-fast) var(--brx-ease-out)',
          ...props.style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--brx-border-focus)';
          e.currentTarget.style.boxShadow = 'var(--brx-shadow-focus)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--brx-border-error)' : 'var(--brx-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {(error || helperText) && (
        <p
          style={{
            marginTop: 'var(--brx-spacing-2)',
            fontSize: 'var(--brx-text-sm)',
            color: error ? 'var(--brx-color-error)' : 'var(--brx-text-tertiary)',
          }}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

// ============================================
// EXAMPLE 7: Modal/Dialog
// ============================================

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--brx-bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--brx-spacing-4)',
        zIndex: 'var(--brx-z-modal)',
        animation: 'brx-fade-in var(--brx-duration-normal) var(--brx-ease-out)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--brx-bg-primary)',
          borderRadius: 'var(--brx-radius-2xl)',
          padding: 'var(--brx-spacing-6)',
          maxWidth: '32rem',
          width: '100%',
          boxShadow: 'var(--brx-shadow-2xl)',
          animation: 'brx-scale-in var(--brx-duration-normal) var(--brx-ease-premium)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2
            style={{
              fontFamily: 'var(--brx-font-display)',
              fontSize: 'var(--brx-text-2xl)',
              fontWeight: 'var(--brx-font-bold)',
              color: 'var(--brx-text-primary)',
              marginBottom: 'var(--brx-spacing-4)',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};

// ============================================
// EXAMPLE 8: Grid Layout
// ============================================

export const Grid: React.FC<{
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: number;
}> = ({ children, columns = 3, gap = 6 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `var(--brx-spacing-${gap})`,
      }}
    >
      {children}
    </div>
  );
};

// ============================================
// EXAMPLE 9: Alert/Notification
// ============================================

export const Alert: React.FC<{
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  onClose?: () => void;
}> = ({ children, variant = 'info', onClose }) => {
  const variantStyles = {
    success: {
      background: 'var(--brx-color-success-light)',
      color: 'var(--brx-color-success-dark)',
      borderColor: 'var(--brx-color-success)',
    },
    warning: {
      background: 'var(--brx-color-warning-light)',
      color: 'var(--brx-color-warning-dark)',
      borderColor: 'var(--brx-color-warning)',
    },
    error: {
      background: 'var(--brx-color-error-light)',
      color: 'var(--brx-color-error-dark)',
      borderColor: 'var(--brx-color-error)',
    },
    info: {
      background: 'var(--brx-color-info-light)',
      color: 'var(--brx-color-info-dark)',
      borderColor: 'var(--brx-color-info)',
    },
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--brx-spacing-4)',
        borderRadius: 'var(--brx-radius-lg)',
        borderLeft: `4px solid ${variantStyles[variant].borderColor}`,
        ...variantStyles[variant],
      }}
    >
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontSize: 'var(--brx-text-xl)',
            padding: 'var(--brx-spacing-1)',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

// ============================================
// EXAMPLE USAGE IN A PAGE
// ============================================

export const ExamplePage: React.FC = () => {
  return (
    <div style={{ padding: 'var(--brx-spacing-8)', maxWidth: '80rem', margin: '0 auto' }}>
      {/* Hero Section */}
      <section style={{ marginBottom: 'var(--brx-spacing-16)' }}>
        <Heading level={1} gradient>
          Welcome to Broxiva
        </Heading>
        <BodyText size="lg">Discover premium products with our AI-powered shopping experience.</BodyText>
        <div style={{ display: 'flex', gap: 'var(--brx-spacing-4)' }}>
          <PremiumButton variant="primary">Shop Now</PremiumButton>
          <PremiumButton variant="secondary">Learn More</PremiumButton>
        </div>
      </section>

      {/* Cards Grid */}
      <Grid columns={3}>
        <PremiumCard variant="default">
          <Heading level={3}>Premium Quality</Heading>
          <BodyText>Curated selection of high-end products</BodyText>
          <Badge variant="primary">Featured</Badge>
        </PremiumCard>

        <PremiumCard variant="glass">
          <Heading level={3}>AI-Powered</Heading>
          <BodyText>Smart recommendations just for you</BodyText>
          <Badge variant="secondary">New</Badge>
        </PremiumCard>

        <PremiumCard variant="premium">
          <Heading level={3}>Fast Delivery</Heading>
          <BodyText>Express shipping on all orders</BodyText>
          <Badge variant="success">Free</Badge>
        </PremiumCard>
      </Grid>

      {/* Alert Example */}
      <div style={{ marginTop: 'var(--brx-spacing-8)' }}>
        <Alert variant="success">Your order has been confirmed!</Alert>
      </div>

      {/* Input Example */}
      <div style={{ marginTop: 'var(--brx-spacing-8)', maxWidth: '400px' }}>
        <Input label="Email Address" placeholder="Enter your email" helperText="We'll never share your email" />
      </div>
    </div>
  );
};

export default ExamplePage;
