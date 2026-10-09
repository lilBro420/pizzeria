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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-[2px] select-none">
      <div
        className={`w-full ${maxWidth} flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[96vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between font-bold text-base select-none shrink-0 border-b border-slate-800">
          <span className="truncate">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black text-sm ml-2 flex items-center justify-center transition-colors"
            title="Cerrar"
          >
            <CrossIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-50">{children}</div>
      </div>
    </div>
  )
}
