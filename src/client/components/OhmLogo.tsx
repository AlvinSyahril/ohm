import React from 'react';

interface OhmLogoProps {
  className?: string;
  /** 'mark' crops tightly to the broken ring and bars; 'tile' renders the full app icon squircle. */
  variant?: 'mark' | 'tile';
}

/**
 * Vector Ohm resonance mark locked to Editorial Minimal tokens (#121513, #f4f6f4, #2eb872).
 */
export const OhmLogo: React.FC<OhmLogoProps> = ({
  className = 'w-7 h-7',
  variant = 'mark',
}) => (
  <svg
    viewBox={variant === 'tile' ? '0 0 512 512' : '96 96 320 320'}
    fill="none"
    aria-hidden
    className={className}
  >
    {variant === 'tile' && (
      <rect
        x="16"
        y="16"
        width="480"
        height="480"
        rx="108"
        fill="#121513"
        stroke="#262b28"
        strokeWidth="3"
      />
    )}
    <path
      d="M 218.5 386.7 A 136 136 0 1 1 293.5 386.7"
      stroke="#f4f6f4"
      strokeWidth={variant === 'tile' ? 30 : 32}
      strokeLinecap="round"
    />
    <rect x="182" y="198" width="28" height="104" rx="14" fill="#2eb872" />
    <rect x="182" y="242" width="28" height="60" rx="14" fill="#f4f6f4" />
    <rect x="242" y="166" width="28" height="160" rx="14" fill="#2eb872" />
    <rect x="242" y="248" width="28" height="78" rx="14" fill="#f4f6f4" />
    <rect x="302" y="204" width="28" height="104" rx="14" fill="#2eb872" />
    <rect x="302" y="226" width="28" height="32" rx="14" fill="#f4f6f4" />
  </svg>
);
