import type { ReactNode } from 'react'
import { Label } from './ui'

/** Opening block for every inner page: label, headline, short introduction. */
export function PageHead({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head wrap">
      <Label>{label}</Label>
      <h1 className="display display--sm">{title}</h1>
      {children && <p className="lede">{children}</p>}
    </header>
  )
}
