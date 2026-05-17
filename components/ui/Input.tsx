'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2.5 rounded-xl
          bg-white/5 border border-white/10
          text-white placeholder-white/30
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1.5 text-xs text-white/40">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
