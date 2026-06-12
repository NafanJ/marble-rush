'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ink-950';

  const variantStyles = {
    primary: 'btn-primary focus:ring-neon-violet/60',
    secondary: 'btn-ghost focus:ring-white/30',
    danger: 'btn-danger focus:ring-red-500/60',
    ghost: 'bg-transparent border-transparent text-white/70 hover:text-white hover:bg-white/10 focus:ring-white/20',
  };

  const sizeStyles = {
    sm: '!px-3 !py-1.5 !text-sm',
    md: '',
    lg: '!px-7 !py-3.5 !text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
