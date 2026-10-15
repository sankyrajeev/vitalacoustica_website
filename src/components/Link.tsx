import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { href, navigate } from '../router'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

/** Internal link. Plain <a> underneath, so middle-click, new tabs and keyboard work as expected. */
export function Link({ to, onClick, target, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    // let the browser handle new-tab / modified clicks
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={href(to)} onClick={handle} target={target} {...rest} />
}
