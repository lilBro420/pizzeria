import React from 'react'

interface PanelProps {
  title?: string
  inset?: boolean
  className?: string
  children: React.ReactNode
  headerRight?: React.ReactNode
}

export function Panel({ title, inset = false, className = '', children, headerRight }: PanelProps) {
  const panelBg = inset ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'

  return (
    <div className={`flex flex-col border rounded-xl overflow-hidden shadow-sm ${panelBg} ${className}`}>
      {title && (
        <div className="bg-slate-800 text-white px-3.5 py-2 flex items-center justify-between font-bold text-sm tracking-wide select-none shrink-0 border-b border-slate-700">
          <span className="truncate">{title}</span>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
