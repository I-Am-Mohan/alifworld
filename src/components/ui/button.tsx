import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-lg transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-brand-orange text-black hover:bg-brand-orangeHover focus:ring-brand-orangeFocus shadow-lg shadow-orange-500/20',
      secondary:
        'bg-neutral-800 text-white hover:bg-neutral-700 focus:ring-neutral-600',
      outline:
        'border border-neutral-700 bg-transparent text-white hover:bg-neutral-900 focus:ring-neutral-700',
      danger:
        'bg-red-600 text-white hover:bg-red-500 focus:ring-red-400 shadow-lg shadow-red-600/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
