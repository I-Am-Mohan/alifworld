import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ className = '', elevated = false, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white ${
        elevated ? 'shadow-md shadow-slate-200/60' : 'shadow-sm shadow-slate-100'
      } p-6 transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-bold text-slate-900 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-sm text-slate-600 leading-relaxed ${className}`} {...props}>
      {children}
    </div>
  );
}
