import { useState, type CSSProperties } from 'react'
import { Dithering } from '@paper-design/shaders-react'

const PREVIEWS: { image: string; alt: string }[] = [
  { image: '/projects/home-orange.jpg', alt: 'Peak Love — home, Mountain Mist in orange' },
  { image: '/projects/home-mist.jpg', alt: 'Peak Love — home, black and white mountain range' },
  { image: '/projects/home-kilimanjaro.jpg', alt: 'Peak Love — home, Kilimanjaro in yellow' },
  { image: '/projects/product-huangshin.jpg', alt: 'Peak Love — Mountain Mist product page' },
  { image: '/projects/product-huangshin-story.jpg', alt: 'Peak Love — Huangshin product story' },
  { image: '/projects/product-annapurna.jpg', alt: 'Peak Love — Annapurna packaging' },
  { image: '/projects/shop.jpg', alt: 'Peak Love — shop grid' },
  { image: '/projects/product-dark.jpg', alt: 'Peak Love — Kilimanjaro bottle on black' },
  { image: '/projects/product-kilimanjaro.jpg', alt: 'Peak Love — Kilimanjaro product explorer' },
  { image: '/projects/product-kilimanjaro-detail.jpg', alt: 'Peak Love — Kilimanjaro editorial detail' },
]

export default function App() {
  const [active, setActive] = useState(1)
  const last = PREVIEWS.length - 1

  return (
    <main className="site">
      <div className="panels">
        <nav className="panel nav">
          <a href="/" className="nav-home">
            <span className="mark" />
            <span className="label">Home</span>
          </a>
          <div className="nav-bottom">
            <div className="nav-links">
              <a href="#swipe-file" className="label">Swipe file</a>
              <a href="#experiments" className="label">Experiments</a>
            </div>
            <a href="#book-a-call" className="label">Book a call</a>
          </div>
        </nav>

        <section className="panel intro">
          <div className="intro-top">
            <h1 className="headline">
              Disorder Systems is a full-cycle creative studio for technology companies.
            </h1>
            <p className="body muted">
              Experimental creative studio creating one-of-a-kind identities, web and product
              for startups who wants truely unique identity rather than ai slop
            </p>
          </div>
          <a href="#about" className="body underline">More about us and our vision</a>
        </section>
      </div>

      <section className="showcase" aria-label="Selected work">
        <Dithering
          className="dither"
          speed={2}
          shape="swirl"
          type="8x8"
          size={3.7}
          scale={0.11}
          colorBack="#00000000"
          colorFront="#657A90"
        />
        <div className="reel" style={{ '--i': active } as CSSProperties}>
          {PREVIEWS.map((p, i) => (
            <button
              key={i}
              type="button"
              className={`slide${i === active ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Preview ${i + 1}`}
              aria-current={i === active}
            >
              <img src={p.image} alt={p.alt} decoding="async" />
            </button>
          ))}
        </div>

        <div className="scrubber">
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={active}
            onChange={(e) => setActive(Number(e.target.value))}
            style={{ '--p': `${(active / last) * 100}%` } as CSSProperties}
            aria-label="Browse previews"
          />
          <span className="scrubber-count">
            {String(active + 1).padStart(2, '0')} / {String(PREVIEWS.length).padStart(2, '0')}
          </span>
        </div>
      </section>
    </main>
  )
}
