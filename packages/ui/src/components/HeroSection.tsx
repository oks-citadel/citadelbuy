/**
 * Broxiva Design System - Hero Section Component
 * Immersive hero component for luxury e-commerce landing pages
 */

import React from 'react';
import { cn } from '../utils';
import Button from './Button';

export interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  description?: string;
  primaryCta?: {
    text: string;
    onClick: () => void;
  };
  secondaryCta?: {
    text: string;
    onClick: () => void;
  };
  backgroundImage?: string;
  backgroundOverlay?: boolean;
  alignment?: 'left' | 'center' | 'right';
  height?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      title,
      subtitle,
      description,
      primaryCta,
      secondaryCta,
      backgroundImage,
      backgroundOverlay = true,
      alignment = 'center',
      height = 'lg',
      children,
      ...props
    },
    ref
  ) => {
    // Height styles
    const heightStyles = {
      sm: 'min-h-[400px]',
      md: 'min-h-[500px]',
      lg: 'min-h-[600px]',
      xl: 'min-h-[700px]',
      full: 'min-h-screen',
    };

    // Alignment styles
    const alignmentStyles = {
      left: 'items-start text-left',
      center: 'items-center text-center',
      right: 'items-end text-right',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full overflow-hidden',
          heightStyles[height],
          className
        )}
        {...props}
      >
        {/* Background image */}
        {backgroundImage && (
          <>
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            {backgroundOverlay && (
              <div className="absolute inset-0 z-10 bg-gradient-to-br from-neutral-900/70 to-neutral-900/50" />
            )}
          </>
        )}

        {/* Content container */}
        <div className="relative z-20 h-full">
          <div className="container mx-auto px-4 h-full">
            <div
              className={cn(
                'flex flex-col justify-center h-full py-20',
                alignmentStyles[alignment]
              )}
            >
              <div className="max-w-4xl">
                {/* Subtitle */}
                {subtitle && (
                  <p
                    className={cn(
                      'text-sm font-semibold tracking-widest uppercase mb-4',
                      backgroundImage
                        ? 'text-accent-400'
                        : 'text-accent-600'
                    )}
                  >
                    {subtitle}
                  </p>
                )}

                {/* Title */}
                <h1
                  className={cn(
                    'font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6',
                    'leading-tight tracking-tight',
                    backgroundImage
                      ? 'text-white'
                      : 'text-neutral-900'
                  )}
                >
                  {title}
                </h1>

                {/* Description */}
                {description && (
                  <p
                    className={cn(
                      'text-lg md:text-xl mb-8 max-w-2xl',
                      backgroundImage
                        ? 'text-neutral-100'
                        : 'text-neutral-600',
                      alignment === 'center' && 'mx-auto'
                    )}
                  >
                    {description}
                  </p>
                )}

                {/* CTAs */}
                {(primaryCta || secondaryCta) && (
                  <div
                    className={cn(
                      'flex flex-col sm:flex-row gap-4',
                      alignment === 'center' && 'justify-center',
                      alignment === 'right' && 'justify-end'
                    )}
                  >
                    {primaryCta && (
                      <Button
                        variant="accent"
                        size="xl"
                        onClick={primaryCta.onClick}
                        className="shadow-xl hover:shadow-2xl"
                      >
                        {primaryCta.text}
                      </Button>
                    )}
                    {secondaryCta && (
                      <Button
                        variant={backgroundImage ? 'outline' : 'secondary'}
                        size="xl"
                        onClick={secondaryCta.onClick}
                        className={cn(
                          backgroundImage && 'text-white border-white hover:bg-white/10'
                        )}
                      >
                        {secondaryCta.text}
                      </Button>
                    )}
                  </div>
                )}

                {/* Custom content */}
                {children && (
                  <div className="mt-8">
                    {children}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
      </div>
    );
  }
);

HeroSection.displayName = 'HeroSection';

export default HeroSection;
