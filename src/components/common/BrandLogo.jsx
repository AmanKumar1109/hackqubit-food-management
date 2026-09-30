import React from 'react';

/**
 * Brand Logo component rendering the signature Arcana faceted geometric "A" and brand name
 */
export const BrandLogo = ({ size = 'default', showText = true, className = '', theme = 'dark' }) => {
  const isLarge = size === 'large';
  const isDarkText = theme === 'dark';

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Faceted 3D Geometric "A" Icon */}
      <svg
        className={isLarge ? 'w-16 h-16' : 'w-9 h-9'}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="facetLeft" x1="20" y1="90" x2="50" y2="10" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3A3C42" />
            <stop offset="1" stopColor="#1E2024" />
          </linearGradient>
          <linearGradient id="facetRight" x1="50" y1="10" x2="85" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1B1C20" />
            <stop offset="1" stopColor="#0B0C0E" />
          </linearGradient>
          <linearGradient id="facetCrossbar" x1="32" y1="68" x2="68" y2="74" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4A4C54" />
            <stop offset="1" stopColor="#25262B" />
          </linearGradient>
        </defs>

        {/* Left outer leg */}
        <polygon points="50,12 18,88 34,88 50,45" fill="url(#facetLeft)" />
        {/* Right outer leg */}
        <polygon points="50,12 50,45 66,88 82,88" fill="url(#facetRight)" />
        {/* Inner crossbar / shadow wedge */}
        <polygon points="34,68 66,68 58,52 42,52" fill="url(#facetCrossbar)" opacity="0.9" />
        {/* Subtle highlight edge */}
        <line x1="50" y1="12" x2="18" y2="88" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>

      {showText && (
        <span
          className={`font-bold tracking-tight mt-1 ${
            isLarge ? 'text-lg' : 'text-sm'
          } ${isDarkText ? 'text-neutral-900' : 'text-white'}`}
        >
          Arcana <span className="font-semibold text-neutral-500">FoodOps</span>
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
