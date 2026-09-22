import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'orange' | 'blue' | 'cyan' | 'green' | 'success' | 'warning' | 'danger' | 'error' | 'outline' | 'black';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  className = '',
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-bold tracking-wide uppercase rounded-full select-none';

  const variants = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    orange: 'bg-orange-50 text-[#EA580C] border border-orange-200/90 font-bold',
    blue: 'bg-sky-50 text-[#0284C7] border border-sky-200/90 font-bold',
    cyan: 'bg-cyan-50 text-[#0891B2] border border-cyan-200/90 font-bold',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-bold',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-bold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/90 font-bold',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/90 font-bold',
    error: 'bg-rose-50 text-rose-700 border border-rose-200/90 font-bold',
    outline: 'bg-white text-slate-700 border border-slate-300',
    black: 'bg-black text-white border border-black',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-xs',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </span>
  );
}
