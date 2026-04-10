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
    <section className="space-y-8 md:space-y-10">
      <div className="space-y-3">
        <p className="eyebrow-label">
          Module
        </p>
        <div className="space-y-2.5">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  )
}
