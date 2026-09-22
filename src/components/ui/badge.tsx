import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'orange' | 'blue' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className = '',
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-bold tracking-wide uppercase rounded-full';

  const variants = {
    default: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
    orange: 'bg-orange-950/80 text-brand-orange border border-orange-700/60',
    blue: 'bg-blue-950/80 text-brand-globeLightBlue border border-blue-700/60',
    success: 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60',
    warning: 'bg-amber-950/80 text-amber-300 border border-amber-700/60',
    danger: 'bg-red-950/80 text-red-400 border border-red-700/60',
    outline: 'bg-transparent text-neutral-300 border border-neutral-600',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </span>
  );
}
