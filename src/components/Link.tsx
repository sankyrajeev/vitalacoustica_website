import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { currentPath, href } from '../router'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

/** Internal link. Plain <a> underneath, so middle-click and keyboard work as expected. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (currentPath() === to && !e.defaultPrevented) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  return <a href={href(to)} onClick={handle} {...rest} />
}

