import { useState, type CSSProperties } from 'react'
import { Dithering } from '@paper-design/shaders-react'

const PREVIEWS: { image?: string; alt?: string }[] = [
  {},
  { image: '/peak-love.jpg', alt: 'Peak Love website — black and white mountain range' },
  {},
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
              {p.image && <img src={p.image} alt={p.alt} />}
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
