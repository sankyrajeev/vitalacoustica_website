import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Chat } from './components/Chat'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { StageModelOverlay } from './components/StageModel'
import { capabilityById } from './content/capabilities'
import { fullName, gearById, type GearId } from './content/gear'
import { projectBySlug } from './content/projects'
import { site } from './content/site'
import { useRevealOnScroll } from './hooks/useMedia'
import { ThemeProvider } from './hooks/useTheme'
import { Home } from './pages/Home'
import { productById } from './content/shop'
import { match, useRoute } from './router'

// every page but the homepage loads its own code when it's first opened
const AccountPage = lazy(() => import('./pages/Account').then((m) => ({ default: m.AccountPage })))
const ForgotPage = lazy(() => import('./pages/Account').then((m) => ({ default: m.ForgotPage })))
const ResetPage = lazy(() => import('./pages/Account').then((m) => ({ default: m.ResetPage })))
const AdminPage = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminPage })))
const CapabilitiesIndex = lazy(() => import('./pages/Capabilities').then((m) => ({ default: m.CapabilitiesIndex })))
const CapabilityPage = lazy(() => import('./pages/Capabilities').then((m) => ({ default: m.CapabilityPage })))
const LegalPage = lazy(() => import('./pages/Legal').then((m) => ({ default: m.LegalPage })))
const PrivacyPage = lazy(() => import('./pages/Legal').then((m) => ({ default: m.PrivacyPage })))
const ContactPage = lazy(() => import('./pages/Other').then((m) => ({ default: m.ContactPage })))
const DeckPage = lazy(() => import('./pages/Other').then((m) => ({ default: m.DeckPage })))
const NotFoundPage = lazy(() => import('./pages/Other').then((m) => ({ default: m.NotFoundPage })))
const JournalArticle = lazy(() => import('./pages/Journal').then((m) => ({ default: m.JournalArticle })))
const JournalIndex = lazy(() => import('./pages/Journal').then((m) => ({ default: m.JournalIndex })))
const TestimonialsPage = lazy(() => import('./pages/Testimonials').then((m) => ({ default: m.TestimonialsPage })))
const CareersPage = lazy(() => import('./pages/Careers').then((m) => ({ default: m.CareersPage })))
const StoryPage = lazy(() => import('./pages/Story').then((m) => ({ default: m.StoryPage })))
const CaseStudy = lazy(() => import('./pages/Work').then((m) => ({ default: m.CaseStudy })))
const WorkIndex = lazy(() => import('./pages/Work').then((m) => ({ default: m.WorkIndex })))
const EquipmentDetail = lazy(() => import('./pages/Equipment').then((m) => ({ default: m.EquipmentDetail })))
const EquipmentIndex = lazy(() => import('./pages/Equipment').then((m) => ({ default: m.EquipmentIndex })))
const ShopIndex = lazy(() => import('./pages/Shop').then((m) => ({ default: m.ShopIndex })))
const ShopItem = lazy(() => import('./pages/Shop').then((m) => ({ default: m.ShopItem })))

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
  if (path === '/blog') return { title: 'The Acoustica Journal', page: <JournalIndex /> }
  const article = match('/blog/:slug', path)
  if (article) return { title: 'The Acoustica Journal', page: <JournalArticle slug={article.slug} /> }
  if (path === '/deck') return { title: 'Capability deck', page: <DeckPage /> }
  if (path === '/contact') return { title: 'Get a quote', page: <ContactPage /> }
  if (path === '/story') return { title: 'Our Story', page: <StoryPage /> }
  if (path === '/careers') return { title: 'Careers', page: <CareersPage /> }
  if (path === '/testimonials') return { title: 'Testimonials', page: <TestimonialsPage /> }
  if (path === '/account') return { title: 'Your account', page: <AccountPage /> }
  if (path === '/account/forgot') return { title: 'Forgotten password', page: <ForgotPage /> }
  if (path === '/account/admin') return { title: 'Admin', page: <AdminPage /> }
  if (path === '/account/reset') return { title: 'Choose a new password', page: <ResetPage /> }
  if (path === '/privacy') return { title: 'Privacy notice', page: <PrivacyPage /> }
  if (path === '/legal') return { title: 'Legal information', page: <LegalPage /> }
  return { title: 'Not found', page: <NotFoundPage /> }
}

function Page({ path }: { path: string }) {
  const { title, page } = resolve(path)
  useRevealOnScroll(path)
  // only the homepage settles on its sections as you scroll (Home.tsx); every other page scrolls freely

  useEffect(() => {
    document.title = path === '/' ? title : `${title} — ${site.name}`
    window.scrollTo({ top: 0, behavior: 'auto' })
    // move focus to the new page for keyboard and screen-reader users (not on first load)
    if (performance.now() > 1500) document.getElementById('main')?.focus({ preventScroll: true })
  }, [path, title])

  return (
    <main id="main" tabIndex={-1} className={`page ${path === '/' ? 'page--home' : ''}`} key={path}>
      <Suspense fallback={<div className="page-loading" />}>{page}</Suspense>
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
