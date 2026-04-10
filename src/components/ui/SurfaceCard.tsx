import type { ReactNode } from 'react'

interface SurfaceCardProps {
  title: string
  description: string
  children?: ReactNode
  className?: string
}

export function SurfaceCard({
  title,
  description,
  children,
  className = '',
}: SurfaceCardProps) {
  const classes = ['surface-panel p-6 md:p-7', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="space-y-2.5">
        <h2 className="text-lg font-medium tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
