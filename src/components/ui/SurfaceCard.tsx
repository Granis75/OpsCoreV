import type { ReactNode } from 'react'

interface SurfaceCardProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function SurfaceCard({
  title,
  description,
  children,
  className = '',
}: SurfaceCardProps) {
  const classes = ['surface-panel p-6 md:p-8', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="space-y-1.5">
        <h2 className="font-serif text-lg font-medium tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
