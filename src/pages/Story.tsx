import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ResonanceBackdrop } from '../components/ResonanceBackdrop'
import { Cta, Logo } from '../components/ui'
import { pointAt } from '../three/resonance/director'
import {
  StoryBeams,
  StoryCrowd,
  StoryFriends,
  StoryHeart,
  StoryMix,
  StoryQuestion,
  StorySpeaker,
} from '../components/story/Visuals'

// Our Story. The Resonance Form turns with each chapter; key lines light up word by word
// as they scroll through; the four qualities of sound steer the sculpture when pointed at.

const CHAPTERS = [
  { id: 'beginning', n: '01', title: 'The beginning' },
  { id: 'missing', n: '02', title: 'What was missing' },
  { id: 'question', n: '03', title: 'The question' },
  { id: 'feeling', n: '04', title: 'A feeling' },
  { id: 'sound', n: '05', title: 'Sound is felt' },
  { id: 'curiosity', n: '06', title: 'Curiosity' },
  { id: 'purpose', n: '07', title: 'Purpose' },
  { id: 'after', n: '08', title: 'After the last track' },
  { id: 'why', n: '09', title: 'Why we do it' },
]

/** Sets --p (0 → 1) on the element as it travels from the bottom of the screen to above the middle. */
function useScrollProgress<T extends HTMLElement>(start = 0.88, end = 0.42) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', '1')
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const from = vh * start
      const to = vh * end - r.height * 0.5
      const p = Math.min(1, Math.max(0, (from - r.top) / (from - to)))
      el.style.setProperty('--p', p.toFixed(3))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [start, end])
  return ref
}

/** A line whose words light up one after another as it scrolls into place. */
function Lighting({ text, as: Tag = 'p', className = '' }: { text: string; as?: 'p' | 'h2' | 'blockquote'; className?: string }) {
  const ref = useScrollProgress<HTMLElement>()
  const words = text.split(' ')
  return (
    <Tag
      ref={ref as never}
      className={`lighting ${className}`}
      style={{ '--n': words.length } as CSSProperties}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} aria-hidden style={{ '--i': i } as CSSProperties}>
          {w}{' '}
        </span>
      ))}
    </Tag>
  )
}

function Chapter({
  id,
  scene,
  side = 'left',
  visual,
  back,
  children,
}: {
  id: string
  scene: string
  side?: 'left' | 'right' | 'centre'
  visual?: ReactNode // a scene beside the text
  back?: ReactNode // a scene behind centred text
  children: ReactNode
}) {
  const c = CHAPTERS.find((x) => x.id === id)!
  return (
    <section id={id} className={`chapter chapter--${side}`} data-scene={scene} data-n={c.n} aria-labelledby={`${id}-title`}>
      {back && (
        <div className="chapter__back" aria-hidden>
          {back}
        </div>
      )}
      <div className={`wrap chapter__inner ${visual ? 'has-visual' : ''}`}>
        <div className="chapter__text">
          <p className="chapter__n">
            <span>{c.n}</span>
            <span id={`${id}-title`}>{c.title}</span>
          </p>
          {children}
        </div>
        {visual && (
          <div className="chapter__visual" aria-hidden>
            {visual}
          </div>
        )}
      </div>
    </section>
  )
}

/** Fixed rail of chapter marks; shows where you are and jumps between chapters. */
function Rail() {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), {
      rootMargin: '-45% 0px -50% 0px',
    })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <nav className={`rail ${active ? 'is-on' : ''}`} aria-label="Chapters">
      {CHAPTERS.map((c) => (
        <a
          key={c.id}
          href={`#${c.id}`}
          className={active === c.id ? 'is-active' : ''}
          aria-current={active === c.id ? 'true' : undefined}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          <span className="rail__n">{c.n}</span>
          <span className="rail__t">{c.title}</span>
        </a>
      ))}
    </nav>
  )
}

const QUALITIES = [
  { id: 'depth', word: 'Depth', line: 'Every layer of a melody.' },
  { id: 'clarity', word: 'Clarity', line: 'Details you might never have noticed before.' },
  { id: 'warmth', word: 'Warmth', line: 'Lighting that moves with the music.' },
  { id: 'impact', word: 'Impact', line: 'The kick in your chest.' },
]

/** Point at a quality and the sculpture shows it. */
function Qualities() {
  const [on, setOn] = useState<string | null>(null)
  const set = (id: string | null) => {
    setOn(id)
    pointAt(id ? `feel-${id}` : null)
  }
  useEffect(() => () => pointAt(null), [])
  return (
    <div className="qualities" onPointerLeave={() => set(null)}>
      {QUALITIES.map((q, i) => (
        <button
          key={q.id}
          className={`quality ${on === q.id ? 'is-on' : ''}`}
          onPointerEnter={(e) => e.pointerType === 'mouse' && set(q.id)}
          onFocus={() => set(q.id)}
          onBlur={() => set(null)}
          onClick={() => set(on === q.id ? null : q.id)}
          aria-pressed={on === q.id}
        >
          <span className="quality__n">0{i + 1}</span>
          <span className="quality__word">{q.word}</span>
          <span className="quality__line">{q.line}</span>
        </button>
      ))}
    </div>
  )
}

export function StoryPage() {
  const every = useScrollProgress<HTMLDivElement>(0.9, 0.3)
  return (
    <div className="story">
      <ResonanceBackdrop />
      <Rail />

      <section className="story-hero" data-scene="story-open" aria-labelledby="story-title">
        <div className="wrap story-hero__inner">
          <p className="label">Our Story</p>
          <h1 id="story-title" className="display story-hero__title">
            <span>It Was Never Just About the Sound.</span>
            <em>It Was About the Feeling.</em>
          </h1>
        </div>
        <a
          className="intro__scroll"
          href="#beginning"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('beginning')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          Read
          <span aria-hidden />
        </a>
      </section>

      <Chapter id="beginning" scene="story-friends" side="right" visual={<StoryFriends />}>
        <p className="chapter__lede">
          Vital Acoustica began with two best friends, <strong>Sankarsh</strong> and <strong>Harsh</strong>, and a shared love for
          music.
        </p>
        <p className="chapter__body">
          We spent countless nights going to shows, immersing ourselves in the music, feeling the energy of the crowd, and
          discovering what made a great night unforgettable.
        </p>
      </Chapter>

      <Chapter id="missing" scene="story-missing" visual={<StoryMix />}>
        <p className="chapter__body">But we also started noticing what was missing.</p>
        <ul className="missing">
          <li>The sound lacked depth.</li>
          <li>The lights lacked intention.</li>
          <li>The music we loved wasn’t always being experienced the way it was meant to be.</li>
        </ul>
        <p className="chapter__body">
          We would book artists we loved, turn up expecting something extraordinary, and sometimes walk away disappointed. We knew
          what the music could feel like. We knew how much more there was to experience in every beat, every rhythm, every
          transition, and every subtle detail of a track. Yet, something was getting lost between the artist and the audience.
        </p>
      </Chapter>

      <Chapter id="question" scene="story-question" side="centre" back={<StoryQuestion />}>
        <p className="chapter__body">Eventually, we asked ourselves a simple question:</p>
        <Lighting
          as="blockquote"
          className="question"
          text="What if we could create the experience we had always wanted to be part of?"
        />
        <p className="question__answer">
          That question became <Logo className="question__logo" />
        </p>
      </Chapter>

      <Chapter id="feeling" scene="story-feeling" visual={<StoryHeart />}>
        <Lighting
          className="chapter__lede"
          text="We didn’t start with a business plan or a desire to simply own equipment. We started with a feeling —"
        />
        <p className="chapter__body">
          the belief that people deserved more from the shows they attended. We wanted to create experiences that made people come
          back, not just because of the artist on the lineup, but because of how the night made them feel.
        </p>
      </Chapter>

      <Chapter id="sound" scene="story-sound" side="centre">
        <p className="chapter__lede">
          For us, great sound is about more than volume. It’s about depth, clarity, warmth, and impact.
        </p>
        <Qualities />
        <p className="chapter__body chapter__body--narrow">
          It’s about feeling the kick in your chest, hearing every layer of a melody, and discovering details in music you might
          never have noticed before. And when sound comes together with lighting that moves with the music and enhances its
          emotion, something special happens.
        </p>
      </Chapter>

      <Chapter id="curiosity" scene="story-curious" side="right" visual={<StorySpeaker />}>
        <p className="chapter__lede">Our curiosity took us deeper.</p>
        <p className="chapter__body">
          We explored the technical side of sound, lighting, music, and the systems that bring them together. We studied how
          equipment works, how spaces respond to sound, how light shapes an atmosphere, and how technology can be used creatively.
          We kept experimenting, questioning, learning, and looking for innovative ways to make everything work as one.
        </p>
        <p className="verbs" aria-hidden>
          <span>Experimenting</span>
          <span>Questioning</span>
          <span>Learning</span>
        </p>
      </Chapter>

      <Chapter id="purpose" scene="story-purpose" visual={<StoryBeams />}>
        <p className="chapter__body">
          That mindset continues to define us. We aren’t interested in simply putting speakers in a room or pointing lights at a
          stage. We want every element to have a purpose.
        </p>
        <div
          ref={every}
          className="every"
          aria-label="Every frequency, every beam, every transition, every detail should contribute to the experience."
        >
          {['frequency', 'beam', 'transition', 'detail'].map((w, i) => (
            <span key={w} style={{ '--i': i } as CSSProperties} aria-hidden>
              <em>Every</em> {w}
            </span>
          ))}
          <small aria-hidden>should contribute to the experience.</small>
        </div>
      </Chapter>

      <Chapter id="after" scene="story-night" side="centre" back={<StoryCrowd />}>
        <Lighting
          className="chapter__lede after__lede"
          text="Because at the end of the night, the equipment comes down, the lights switch off, and the crowd goes home."
        />
        <p className="chapter__body chapter__body--narrow">
          What matters to us is what they take with them — the bass they felt, the rhythm they lost themselves in, the energy they
          shared, and the memory of a night they wish hadn’t ended.
        </p>
      </Chapter>

      <Chapter id="why" scene="story-end" side="centre">
        <h2 className="display display--sm why__title">That’s why we do what we do.</h2>
        <p className="chapter__body chapter__body--narrow">
          Vital Acoustica is our way of giving people the experience we always wanted for ourselves — one where sound is felt,
          light has meaning, and music is experienced in its entirety.
        </p>
        <Lighting
          className="why__job"
          text="And if people walk out already looking forward to the next show, we know we’ve done our job."
        />
        <div className="signature">
          <Logo className="signature__logo" />
          <p>
            Built by music lovers. <em>Driven by the experience.</em>
          </p>
        </div>
        <div className="why__actions">
          <Cta to="/contact">Plan your night</Cta>
          <Cta to="/work" variant="quiet">
            See our shows
          </Cta>
        </div>
      </Chapter>
    </div>
  )
}
