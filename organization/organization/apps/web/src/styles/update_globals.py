#!/usr/bin/env python3
# -*- coding: utf-8 -*-

content = """@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 262.1 83.3% 57.8%;  /* Violet 500 */
    --primary-foreground: 210 40% 98%;
    --secondary: 220 14.3% 95.9%;
    --secondary-foreground: 220.9 39.3% 11%;
    --muted: 220 14.3% 95.9%;
    --muted-foreground: 220 8.9% 46.1%;
    --accent: 220 14.3% 95.9%;
    --accent-foreground: 220.9 39.3% 11%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --success: 160 84% 39%;
    --success-foreground: 210 40% 98%;
    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 89%;
    --info: 199 89% 48%;
    --info-foreground: 198 93% 96%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 262.1 83.3% 57.8%;
    --radius: 0.5rem;

    /* Brand colors */
    --brand-violet: 262.1 83.3% 57.8%;
    --brand-gold: 38 92% 50%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 217.2 32.6% 10%;
    --card-foreground: 210 40% 98%;
    --popover: 217.2 32.6% 10%;
    --popover-foreground: 210 40% 98%;
    --primary: 262.1 90% 65%;  /* Lighter violet for dark mode */
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 84.2% 65%;
    --destructive-foreground: 210 40% 98%;
    --success: 160 84% 45%;
    --success-foreground: 210 40% 98%;
    --warning: 38 92% 55%;
    --warning-foreground: 48 96% 89%;
    --info: 199 89% 55%;
    --info-foreground: 198 93% 96%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 262.1 90% 65%;

    /* Brand colors for dark mode */
    --brand-violet: 262.1 90% 65%;
    --brand-gold: 38 92% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer utilities {
  /* ========================================
     GRADIENT UTILITIES
     ======================================== */
  .gradient-hero {
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
  }

  .gradient-hero-2 {
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  }

  .gradient-hero-3 {
    background: linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%);
  }

  .gradient-gold {
    background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
  }

  .gradient-text {
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }

  .gradient-mask-b-0 {
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  }

  .gradient-mask-t-0 {
    mask-image: linear-gradient(to top, black 60%, transparent 100%);
  }

  /* ========================================
     GLASS / BLUR EFFECTS
     ======================================== */
  .glass {
    backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.8);
  }

  .glass-dark {
    backdrop-filter: blur(16px);
    background: rgba(0, 0, 0, 0.6);
  }

  /* ========================================
     ANIMATION CLASSES
     ======================================== */
  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-pulse-soft {
    animation: pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-slide-up-fade {
    animation: slide-up-fade 0.4s ease-out;
  }

  .animate-scale-in {
    animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }

  .animate-spin-slow {
    animation: spin 3s linear infinite;
  }

  /* ========================================
     UTILITY CLASSES
     ======================================== */
  .card-hover {
    @apply transition-all duration-300 hover:shadow-xl hover:-translate-y-1;
  }

  .btn-press {
    @apply transition-transform duration-150 active:scale-95;
  }

  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted)) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted));
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground));
  }

  .skeleton {
    @apply animate-pulse bg-muted rounded-md;
    background: linear-gradient(
      90deg,
      hsl(var(--muted)) 0%,
      hsl(var(--muted) / 0.8) 50%,
      hsl(var(--muted)) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .text-balance {
    text-wrap: balance;
  }

  /* ========================================
     PREMIUM EFFECTS
     ======================================== */
  .shine-effect {
    position: relative;
    overflow: hidden;
  }

  .shine-effect::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shine 3s ease-in-out infinite;
  }

  .dark .shine-effect::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
  }

  .glow {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3),
                0 0 40px rgba(139, 92, 246, 0.2),
                0 0 60px rgba(139, 92, 246, 0.1);
  }

  .dark .glow {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4),
                0 0 40px rgba(139, 92, 246, 0.3),
                0 0 60px rgba(139, 92, 246, 0.2);
  }

  /* ========================================
     LEGACY UTILITIES
     ======================================== */
  .btn-hover {
    @apply transition-all duration-150 active:scale-95;
  }

  .shimmer {
    background: linear-gradient(
      90deg,
      hsl(var(--muted)) 0%,
      hsl(var(--muted) / 0.5) 50%,
      hsl(var(--muted)) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
}

/* ========================================
   KEYFRAMES
   ======================================== */
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes slide-up-fade {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shine {
  0% {
    left: -100%;
  }
  20%, 100% {
    left: 100%;
  }
}

/* ========================================
   E-COMMERCE SPECIFIC STYLES
   ======================================== */

/* Voice search animation */
.voice-pulse {
  animation: voice-pulse 1.5s ease-in-out infinite;
}

@keyframes voice-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* AR overlay */
.ar-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
}

/* Product image zoom */
.zoom-container {
  overflow: hidden;
}

.zoom-image {
  transition: transform 0.3s ease;
}

.zoom-container:hover .zoom-image {
  transform: scale(1.1);
}

/* Rating stars */
.star-rating {
  --percent: calc(var(--rating) / 5 * 100%);
  display: inline-block;
  font-size: 1.25rem;
  line-height: 1;
}

.star-rating::before {
  content: '★★★★★';
  letter-spacing: 0.1em;
  background: linear-gradient(
    90deg,
    #fbbf24 var(--percent),
    #d1d5db var(--percent)
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Price strikethrough */
.price-compare {
  position: relative;
}

.price-compare::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px solid currentColor;
}

/* Badge animations */
.badge-bounce {
  animation: badge-bounce 0.3s ease;
}

@keyframes badge-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

/* Toast animations */
.toast-enter {
  animation: toast-enter 0.3s ease-out;
}

.toast-exit {
  animation: toast-exit 0.3s ease-in forwards;
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toast-exit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(100%);
  }
}

/* Dot loader */
.dot-loader {
  display: inline-flex;
  gap: 0.25rem;
}

.dot-loader span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: currentColor;
  animation: dot-bounce 1.4s ease-in-out infinite both;
}

.dot-loader span:nth-child(1) {
  animation-delay: -0.32s;
}

.dot-loader span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Confetti animation for successful actions */
.confetti {
  position: fixed;
  pointer-events: none;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 9999;
}
"""

import os
script_dir = os.path.dirname(os.path.abspath(__file__))
target_file = os.path.join(script_dir, 'globals.css')

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully updated {target_file}")
