import React from 'react';
import Link from 'next/link';

export interface AlifLogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show wordmark alongside the globe icon */
  showWordmark?: boolean;
  /** Link directly to home */
  href?: string;
  /** Optional custom CSS classes */
  className?: string;
}

export function AlifGlobeIcon({ size = 'md', className = '' }: { size?: AlifLogoProps['size']; className?: string }) {
  const pixelSizes = {
    sm: 24,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const dim = pixelSizes[size];

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="AlifWorld Globe"
      role="img"
    >
      <defs>
        {/* Globe 3D Depth Gradient using authoritative globe blues */}
        <radialGradient
          id="alifGlobeDepth"
          cx="35%"
          cy="35%"
          r="65%"
          fx="30%"
          fy="30%"
        >
          <stop offset="0%" stopColor="#69B7E8" />
          <stop offset="45%" stopColor="#4F8FD9" />
          <stop offset="90%" stopColor="#3456A3" />
          <stop offset="100%" stopColor="#1E3260" />
        </radialGradient>
        {/* Subtle glow filter */}
        <filter id="globeGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4F8FD9" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main Spherical Body */}
      <circle cx="24" cy="24" r="22" fill="url(#alifGlobeDepth)" filter="url(#globeGlow)" />

      {/* Latitude Grids */}
      <ellipse cx="24" cy="24" rx="22" ry="7" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.45" />
      <ellipse cx="24" cy="24" rx="22" ry="14" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.4" />
      
      {/* Longitude Meridians */}
      <ellipse cx="24" cy="24" rx="9" ry="22" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.45" />
      <ellipse cx="24" cy="24" rx="16" ry="22" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="24" y1="2" x2="24" y2="46" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.5" />
      <line x1="2" y1="24" x2="46" y2="24" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.5" />

      {/* Outer Specular Ring / Atmosphere */}
      <circle cx="24" cy="24" r="21.5" stroke="#69B7E8" strokeWidth="0.8" strokeOpacity="0.6" />
    </svg>
  );
}

export function AlifLogo({
  size = 'md',
  showWordmark = true,
  href = '/',
  className = '',
}: AlifLogoProps) {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const content = (
    <div className={`inline-flex items-center space-x-3 select-none ${className}`}>
      <AlifGlobeIcon size={size} />
      {showWordmark && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight leading-none ${textSizes[size]} text-white`}>
            ALIF<span className="text-brand-orange">WORLD</span>
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-bold mt-0.5">
              Bangladesh
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
