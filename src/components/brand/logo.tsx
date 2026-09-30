import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

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

  const sizePixels = {
    sm: { width: 96, height: 32 },
    md: { width: 132, height: 44 },
    lg: { width: 168, height: 56 },
    xl: { width: 216, height: 72 },
  };

  const imageElement = (
    <Image
      src="/logo.png"
      alt="AlifWorld"
      width={sizePixels[size].width}
      height={sizePixels[size].height}
      priority
      className={`object-contain transition-transform duration-200 select-none ${sizeClasses[size]}`}
    />
  );

  const wrappedContent = inverted ? (
    <div
      className={`inline-flex items-center bg-white rounded-xl px-2.5 py-1 shadow-sm ${className}`}
    >
      {imageElement}
    </div>
  ) : (
    <div className={`inline-flex items-center ${className}`}>{imageElement}</div>
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
