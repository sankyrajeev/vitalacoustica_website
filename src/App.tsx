import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { Shows } from './components/Shows'
import { CityTicker, Contact, Footer, Reach, Rig, Services } from './components/Sections'
import { useRevealOnScroll } from './hooks/useMedia'
import { ThemeProvider } from './hooks/useTheme'

export default function App() {
  useRevealOnScroll()
  return (
    <ThemeProvider>
      <Nav />
      <main>
        <Hero />
        <CityTicker />
        <Shows />
        <Rig />
        <Services />
        <Reach />
        <Contact />
      </main>
      <Footer />
    </ThemeProvider>
  )
}
