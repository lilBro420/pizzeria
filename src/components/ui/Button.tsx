import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'tab'
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'default',
  active = false,
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  let variantStyles = 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-sm'
  if (variant === 'primary') {
    variantStyles = 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 shadow-sm shadow-blue-500/20'
  } else if (variant === 'success') {
    variantStyles = 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 shadow-sm shadow-emerald-500/20'
  } else if (variant === 'danger') {
    variantStyles = 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 shadow-sm shadow-rose-500/20'
  } else if (variant === 'warning') {
    variantStyles = 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 shadow-sm shadow-amber-500/20'
  } else if (variant === 'tab') {
    if (active) {
      variantStyles = 'bg-white text-blue-700 border-2 border-blue-600 shadow-sm font-black'
    } else {
      variantStyles = 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 font-bold'
    }
  }

  let sizeStyles = 'min-h-[48px] px-4 py-2 text-base'
  if (size === 'sm') {
    sizeStyles = 'min-h-[40px] px-3 py-1.5 text-sm'
  } else if (size === 'lg') {
    sizeStyles = 'min-h-[54px] px-6 py-3 text-lg font-bold'
  }

  const activeRing = active && variant !== 'tab' ? 'ring-2 ring-blue-500 ring-offset-1 font-black' : ''

  return (
    <button
      disabled={disabled}
      className={`pos-button select-none active:scale-[0.98] transition-all duration-100 ${sizeStyles} ${variantStyles} ${activeRing} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
