import React from 'react'
import { CrossIcon } from './Icons'

interface DialogProps {
  title: string
  isOpen: boolean
  onClose: () => void
  maxWidth?: string
  children: React.ReactNode
}

export function Dialog({ title, isOpen, onClose, maxWidth = 'max-w-2xl', children }: DialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-[2px]">
      <div
        className={`w-full ${maxWidth} flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[88dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between font-bold text-sm sm:text-base select-none shrink-0 border-b border-slate-800">
          <span className="truncate">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black text-sm ml-2 flex items-center justify-center transition-colors shrink-0"
            title="Cerrar"
          >
            <CrossIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 sm:p-4 flex-1 overflow-y-auto overscroll-contain touch-pan-y flex flex-col min-h-0 bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  )
}
