import React from 'react'

interface PanelProps {
  title?: string
  inset?: boolean
  className?: string
  children: React.ReactNode
  headerRight?: React.ReactNode
}

export function Panel({ title, inset = false, className = '', children, headerRight }: PanelProps) {
  const borderClass = inset ? 'swing-inset bg-white' : 'swing-outset bg-[#D4D0C8]'

  return (
    <div className={`flex flex-col border-2 ${borderClass} ${className}`}>
      {title && (
        <div className="bg-[#0A246A] text-white px-3 py-1.5 flex items-center justify-between font-bold text-sm tracking-wide select-none shrink-0 border-b border-[#000000]">
          <span>{title}</span>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
