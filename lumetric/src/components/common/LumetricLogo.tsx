'use client';

import React, { useId } from 'react';

export interface LumetricLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'mark' | 'horizontal' | 'vertical';
  showBadge?: boolean;
  badgeText?: string;
  subtitle?: string;
  className?: string;
  textClassName?: string;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 22,
  sm: 28,
  md: 38,
  lg: 48,
  xl: 64,
};

/**
 * Lumetric Premium Vector Emblem
 * Handcrafted 3D Isometric L-Prism with Photonic Aperture & Gradient Rim
 */
export function LumetricLogoMark({
  size = 38,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '_');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Luxury Obsidian Squircle Rim Gradient */}
        <linearGradient id={`lm_rim_${uid}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.75" />
        </linearGradient>

        {/* Ambient Radial Photonic Glow */}
        <radialGradient id={`lm_glow_${uid}`} cx="32" cy="32" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#0A110E" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#070B0E" stopOpacity="0" />
        </radialGradient>

        {/* 'L' Stem Top Bevel Facet */}
        <linearGradient id={`lm_top_${uid}`} x1="16" y1="12" x2="28" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* 'L' Stem Left Facet (Structural Deep Jade) */}
        <linearGradient id={`lm_left_${uid}`} x1="16" y1="18" x2="28" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="55%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022C22" />
        </linearGradient>

        {/* 'L' Stem Inner Right Crease */}
        <linearGradient id={`lm_right_${uid}`} x1="28" y1="18" x2="28" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* 'L' Foot Top Surface */}
        <linearGradient id={`lm_foot_top_${uid}`} x1="26" y1="34" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* 'L' Foot Forward Facet (Cyan Photonic Stream) */}
        <linearGradient id={`lm_foot_front_${uid}`} x1="28" y1="40" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>

        {/* Photonic Aperture Flare */}
        <linearGradient id={`lm_spark_${uid}`} x1="34" y1="12" x2="48" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Soft Glow Filter */}
        <filter id={`lm_filter_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Deep Obsidian Squircle Container Base */}
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="16"
        fill="#0A110E"
        stroke={`url(#lm_rim_${uid})`}
        strokeWidth="1.5"
      />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="16"
        fill={`url(#lm_glow_${uid})`}
      />

      {/* 2. Monolithic 3D 'L' Prism Facets */}
      <g transform="translate(1, 0)">
        {/* Vertical Stem - Left Facing Plane */}
        <path d="M16 18L26 23.5V47L16 41.5V18Z" fill={`url(#lm_left_${uid})`} />

        {/* Vertical Stem - Top Plane */}
        <path d="M26 12.5L34 17L26 21.5L18 17L26 12.5Z" fill={`url(#lm_top_${uid})`} />

        {/* Vertical Stem - Inner Crease */}
        <path d="M26 21.5L34 17V35L26 39.5V21.5Z" fill={`url(#lm_right_${uid})`} opacity="0.92" />

        {/* Foot - Top Plane */}
        <path d="M26 39.5L44 30L48 32.5L30 42L26 39.5Z" fill={`url(#lm_foot_top_${uid})`} />

        {/* Foot - Left Transition */}
        <path d="M26 39.5L30 42V49.5L26 47V39.5Z" fill={`url(#lm_left_${uid})`} />

        {/* Foot - Front Right Facet */}
        <path d="M30 42L48 32.5V38.5L30 49.5V42Z" fill={`url(#lm_foot_front_${uid})`} />

        {/* Specular Edge Highlights */}
        <line x1="26" y1="12.5" x2="34" y2="17" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
        <line x1="16" y1="18" x2="26" y2="23.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
        <line x1="26" y1="23.5" x2="26" y2="47" stroke="#A7F3D0" strokeWidth="0.9" opacity="0.55" />
        <line x1="30" y1="42" x2="48" y2="32.5" stroke="#E0F2FE" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />

        {/* 3. Luminous Photonic Spark (Upper-Right Focal Node) */}
        <g transform="translate(40, 19)" filter={`url(#lm_filter_${uid})`}>
          <path
            d="M0 -7.5L2 -2L7.5 0L2 2L0 7.5L-2 2L-7.5 0L-2 -2Z"
            fill={`url(#lm_spark_${uid})`}
          />
          <circle cx="0" cy="0" r="1.4" fill="#FAF8F5" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Main Lumetric Logo with full branding lockup options
 */
export function LumetricLogo({
  size = 'md',
  variant = 'horizontal',
  showBadge = true,
  badgeText = 'v2.4',
  subtitle = 'AI Data & Decision Studio',
  className = '',
  textClassName = '',
}: LumetricLogoProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];

  if (variant === 'mark') {
    return <LumetricLogoMark size={pixelSize} className={className} />;
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center gap-2.5 ${className}`}>
        <LumetricLogoMark size={pixelSize} />
        <div className={textClassName}>
          <div className="flex items-center justify-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-white font-sans">
              LUMETRIC
            </span>
            {showBadge && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default: 'horizontal'
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LumetricLogoMark size={pixelSize} />
      <div className={textClassName}>
        <div className="flex items-center gap-2 leading-none">
          <span className="font-extrabold text-lg tracking-tight text-white font-sans block">
            LUMETRIC
          </span>
          {showBadge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
