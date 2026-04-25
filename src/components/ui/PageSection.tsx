import type { ReactNode } from 'react'

interface PageSectionProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageSection({ title, description, children }: PageSectionProps) {
  return (
    <section className="space-y-8 md:space-y-10">
      <div className="space-y-3 border-b border-slate-200 pb-7">
        <p className="eyebrow-label">{title}</p>
        <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900 md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
