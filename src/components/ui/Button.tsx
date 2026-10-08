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
  let variantStyles = 'bg-[#E1E1E1] text-black border-t-white border-l-white border-r-[#808080] border-b-[#808080]'
  if (variant === 'primary') {
    variantStyles = 'bg-[#1F4E79] text-white border-t-[#6FA0D2] border-l-[#6FA0D2] border-r-[#0D243A] border-b-[#0D243A]'
  } else if (variant === 'success') {
    variantStyles = 'bg-[#2E7D32] text-white border-t-[#66BB6A] border-l-[#66BB6A] border-r-[#1B5E20] border-b-[#1B5E20]'
  } else if (variant === 'danger') {
    variantStyles = 'bg-[#B71C1C] text-white border-t-[#EF5350] border-l-[#EF5350] border-r-[#5F0909] border-b-[#5F0909]'
  } else if (variant === 'warning') {
    variantStyles = 'bg-[#E65100] text-white border-t-[#FFA726] border-l-[#FFA726] border-r-[#7A2800] border-b-[#7A2800]'
  } else if (variant === 'tab') {
    if (active) {
      variantStyles = 'bg-[#D4D0C8] text-black border-t-[#808080] border-l-[#808080] border-r-white border-b-white font-extrabold'
    } else {
      variantStyles = 'bg-[#B0ACA5] text-[#333333] border-t-white border-l-white border-r-[#808080] border-b-[#808080]'
    }
  }

  let sizeStyles = 'min-h-[48px] px-4 py-2 text-base'
  if (size === 'sm') {
    sizeStyles = 'min-h-[40px] px-3 py-1.5 text-sm'
  } else if (size === 'lg') {
    sizeStyles = 'min-h-[56px] px-6 py-3 text-lg font-bold'
  }

  const activePressed = active && variant !== 'tab' ? 'border-t-[#808080] border-l-[#808080] border-r-white border-b-white bg-[#C4C0B8]' : ''

  return (
    <button
      disabled={disabled}
      className={`swing-button border-2 select-none active:translate-x-[1px] active:translate-y-[1px] ${sizeStyles} ${variantStyles} ${activePressed} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
