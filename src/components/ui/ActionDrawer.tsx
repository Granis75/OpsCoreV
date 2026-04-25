import { X } from 'lucide-react'
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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/15"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <p className="font-serif text-base font-medium text-slate-900">{title}</p>
          <button type="button" onClick={onClose} className="button-pill">
            <X className="h-3 w-3" strokeWidth={1.5} />
            <span>Close</span>
          </button>
        </div>
        <div className="space-y-6 p-6">{children}</div>
      </div>
    </div>
  )
}
