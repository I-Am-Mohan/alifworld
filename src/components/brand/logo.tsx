import React from 'react';
import Link from 'next/link';

export interface AlifLogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Link directly to destination (defaults to '/') */
  href?: string;
  /** Optional custom CSS classes */
  className?: string;
  /** Inverted presentation for dark backgrounds */
  inverted?: boolean;
}

export function AlifLogo({
  size = 'md',
  href = '/',
  className = '',
  inverted = false,
}: AlifLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-11 w-auto',
    lg: 'h-14 w-auto',
    xl: 'h-18 w-auto',
  };

  const imageElement = (
    <img
      src="/logo.png"
      alt="AlifWorld"
      className={`object-contain transition-transform duration-200 select-none ${sizeClasses[size]}`}
    />
  );

  const wrappedContent = inverted ? (
    <div className={`inline-flex items-center bg-white rounded-xl px-2.5 py-1 shadow-sm ${className}`}>
      {imageElement}
    </div>
  ) : (
    <div className={`inline-flex items-center ${className}`}>
      {imageElement}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {wrappedContent}
      </Link>
    );
  }

  return wrappedContent;
}

export default AlifLogo;
