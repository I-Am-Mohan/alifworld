import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-lg transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const variants = {
      // Primary button: Vibrant orange from the logo arrow with crisp white text
      primary:
        'bg-[#FF6A00] text-white hover:bg-[#E55F00] active:bg-[#CC5400] focus:ring-orange-300 shadow-sm shadow-orange-500/25',
      // Secondary button: Clean solid black with white text
      secondary:
        'bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 focus:ring-neutral-400 shadow-sm',
      // Outline button: Crisp light border with dark text
      outline:
        'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus:ring-slate-300 shadow-sm',
      // Danger button: Rose red
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-300 shadow-sm shadow-rose-600/20',
      // Info button: Globe blue
      info:
        'bg-[#0284C7] text-white hover:bg-[#0369A1] active:bg-[#075985] focus:ring-sky-300 shadow-sm shadow-sky-500/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
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
