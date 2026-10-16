import { useEffect, type ReactNode } from 'react'
import { Chat } from './components/Chat'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { StageModelOverlay } from './components/StageModel'
import { capabilityById } from './content/capabilities'
import { fullName, gearById, type GearId } from './content/gear'
import { projectBySlug } from './content/projects'
import { site } from './content/site'
import { useRevealOnScroll } from './hooks/useMedia'
import { PAGE_SECTIONS, useSectionSnap } from './hooks/useSectionSnap'
import { ThemeProvider } from './hooks/useTheme'
import { CapabilitiesIndex, CapabilityPage } from './pages/Capabilities'
import { Home } from './pages/Home'
import { LegalPage, PrivacyPage } from './pages/Legal'
import { ContactPage, DeckPage, JournalPage, NotFoundPage } from './pages/Other'
import { TestimonialsPage } from './pages/Testimonials'
import { CareersPage } from './pages/Careers'
import { StoryPage } from './pages/Story'
import { CaseStudy, WorkIndex } from './pages/Work'
import { EquipmentDetail, EquipmentIndex } from './pages/Equipment'
import { ShopIndex, ShopItem } from './pages/Shop'
import { productById } from './content/shop'
import { match, useRoute } from './router'

type Resolved = { title: string; page: ReactNode }

function resolve(path: string): Resolved {
  if (path === '/') return { title: `${site.name} — Sound & lighting rental and production`, page: <Home /> }
  if (path === '/work') return { title: 'Selected work', page: <WorkIndex /> }
  const work = match('/work/:slug', path)
  if (work) return { title: projectBySlug(work.slug)?.title ?? 'Not found', page: <CaseStudy slug={work.slug} /> }
  if (path === '/equipment') return { title: 'Equipment for hire', page: <EquipmentIndex /> }
  const item = match('/equipment/:id', path)
  if (item) {
    const g = gearById[item.id as GearId]
    return { title: g ? `${fullName(g)} for hire` : 'Not found', page: <EquipmentDetail id={item.id} /> }
  }
  if (path === '/shop') return { title: 'Shop', page: <ShopIndex /> }
  const prod = match('/shop/:id', path)
  if (prod) return { title: productById(prod.id)?.name ?? 'Not found', page: <ShopItem id={prod.id} /> }
  if (path === '/capabilities') return { title: 'Services', page: <CapabilitiesIndex /> }
  const cap = match('/capabilities/:id', path)
  if (cap) return { title: capabilityById(cap.id)?.name ?? 'Not found', page: <CapabilityPage id={cap.id} /> }
  // Studio is retired for now (the name is kept for the real studio); its page stays in Other.tsx
  if (path === '/journal') return { title: 'Journal', page: <JournalPage /> }
  if (path === '/deck') return { title: 'Capability deck', page: <DeckPage /> }
  if (path === '/contact') return { title: 'Get a quote', page: <ContactPage /> }
  if (path === '/story') return { title: 'Our Story', page: <StoryPage /> }
  if (path === '/careers') return { title: 'Careers', page: <CareersPage /> }
  if (path === '/testimonials') return { title: 'Testimonials', page: <TestimonialsPage /> }
  if (path === '/privacy') return { title: 'Privacy notice', page: <PrivacyPage /> }
  if (path === '/legal') return { title: 'Legal information', page: <LegalPage /> }
  return { title: 'Not found', page: <NotFoundPage /> }
}

function Page({ path }: { path: string }) {
  const { title, page } = resolve(path)
  useRevealOnScroll(path)
  // the homepage sets its own stops
  useSectionSnap(path === '/' ? '' : PAGE_SECTIONS)

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
      <Chat />
    </ThemeProvider>
  )
}
