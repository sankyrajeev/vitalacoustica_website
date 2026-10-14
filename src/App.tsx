import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { CityTicker, Contact, Footer, Reach, Services } from './components/Sections'
import { useRevealOnScroll } from './hooks/useMedia'

export default function App() {
  useRevealOnScroll()
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CityTicker />
        <Reach />
        <Services />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
