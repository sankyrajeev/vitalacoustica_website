// The few Cloudflare Workers globals this site uses, declared here rather than pulling in the full
// @cloudflare/workers-types package.

interface CacheStorage {
  /** The data centre's shared cache. */
  readonly default: Cache
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

interface HTMLRewriterElement {
  setAttribute(name: string, value: string): HTMLRewriterElement
  setInnerContent(content: string, options?: { html?: boolean }): HTMLRewriterElement
  append(content: string, options?: { html?: boolean }): HTMLRewriterElement
}

declare class HTMLRewriter {
  on(selector: string, handlers: { element?(element: HTMLRewriterElement): void }): HTMLRewriter
  transform(response: Response): Response
}
