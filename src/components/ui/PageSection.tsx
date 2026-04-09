import type { ReactNode } from 'react'

interface PageSectionProps {
  title: string
  description: string
  children?: ReactNode
}

export function PageSection({
  title,
  description,
  children,
}: PageSectionProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Module
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  )
}
