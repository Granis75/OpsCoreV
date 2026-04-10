import React from 'react'

interface ActionDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function ActionDrawer({ isOpen, onClose, title, children }: ActionDrawerProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="h-full w-full max-w-lg border-l border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-sm text-slate-500 hover:text-slate-900 font-medium px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
