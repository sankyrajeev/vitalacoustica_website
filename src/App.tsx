import { useEffect, type ReactNode } from 'react'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { StageModelOverlay } from './components/StageModel'
import { capabilityById } from './content/capabilities'
import { projectBySlug } from './content/projects'
import { site } from './content/site'
import { useRevealOnScroll } from './hooks/useMedia'
import { ThemeProvider } from './hooks/useTheme'
import { CapabilitiesIndex, CapabilityPage } from './pages/Capabilities'
import { Home } from './pages/Home'
import { ContactPage, DeckPage, JournalPage, LegalPage, NotFoundPage, StudioPage } from './pages/Other'
import { CaseStudy, WorkIndex } from './pages/Work'
import { match, useRoute } from './router'

type Resolved = { title: string; page: ReactNode }

function resolve(path: string): Resolved {
  if (path === '/') return { title: `${site.name} — ${site.headline}`, page: <Home /> }
  if (path === '/work') return { title: 'Selected work', page: <WorkIndex /> }
  const work = match('/work/:slug', path)
  if (work) return { title: projectBySlug(work.slug)?.title ?? 'Not found', page: <CaseStudy slug={work.slug} /> }
  if (path === '/capabilities') return { title: 'Capabilities', page: <CapabilitiesIndex /> }
  const cap = match('/capabilities/:id', path)
  if (cap) return { title: capabilityById(cap.id)?.name ?? 'Not found', page: <CapabilityPage id={cap.id} /> }
  if (path === '/studio') return { title: 'Studio', page: <StudioPage /> }
  if (path === '/journal') return { title: 'Journal', page: <JournalPage /> }
  if (path === '/deck') return { title: 'Capability deck', page: <DeckPage /> }
  if (path === '/contact') return { title: 'Start a project', page: <ContactPage /> }
  if (path === '/privacy') return { title: 'Privacy', page: <LegalPage kind="privacy" /> }
  if (path === '/legal') return { title: 'Legal', page: <LegalPage kind="legal" /> }
  return { title: 'Not found', page: <NotFoundPage /> }
}

function Page({ path }: { path: string }) {
  const { title, page } = resolve(path)
  useRevealOnScroll(path)

  useEffect(() => {
    document.title = path === '/' ? title : `${title} — ${site.name}`
    window.scrollTo({ top: 0, behavior: 'auto' })
    // move focus to the new page for keyboard and screen-reader users (not on first load)
    if (performance.now() > 1500) document.getElementById('main')?.focus({ preventScroll: true })
  }, [path, title])

  return (
    <main id="main" tabIndex={-1} className={`page ${path === '/' ? 'page--home' : ''}`} key={path}>
      {page}
    </main>
  )
}

export default function App() {
  const path = useRoute()
  return (
    <ThemeProvider>
      <a className="skip" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>
      <Nav path={path} />
      <Page path={path} />
      <Footer />
      <StageModelOverlay />
    </ThemeProvider>
  )
}
