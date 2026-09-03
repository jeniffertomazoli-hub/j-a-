import React, { useState } from 'react';

const SIZES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-2xl',
  '2xl': 'w-16 h-16 text-3xl',
};

export default function Avatar({
  foto,
  emoji = '💜',
  nome = '',
  size = 'md',
  corFundo = 'bg-yellow',
  className = '',
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZES[size] || SIZES.md;

  if (foto && !imgError) {
    return (
      <img
        src={foto}
        alt={nome || 'Avatar'}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full border-2 border-ink object-cover shrink-0 shadow-brutsm ${className}`}
        title={nome}
        loading="lazy"
      />
    );
  }

  return (
    <span
      className={`${sizeClass} ${corFundo} rounded-full border-2 border-ink flex items-center justify-center shrink-0 shadow-brutsm select-none ${className}`}
      title={nome}
    >
      {emoji}
    </span>
  );
}
