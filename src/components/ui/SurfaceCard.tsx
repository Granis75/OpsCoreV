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
  const classes = [
    'rounded-3xl border border-white/70 bg-white/80 p-6 shadow-shell backdrop-blur',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="text-sm leading-7 text-slate-600">{description}</p>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
