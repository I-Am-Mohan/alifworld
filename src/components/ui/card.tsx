import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ className = '', elevated = false, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-800 ${
        elevated ? 'bg-neutral-900 shadow-xl' : 'bg-neutral-900/40 backdrop-blur-sm'
      } p-6 ${className}`}
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
    <h3 className={`text-lg font-bold text-white ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-sm text-neutral-400 ${className}`} {...props}>
      {children}
    </div>
  );
}
