import { useState } from 'react'
import { SwarmCanvas } from './SwarmCanvas'

const ABOUT = [
  'Disorder Systems is a pluralistic collective working with type, new media, and generative principles on the web. We are interested in what happens when the unconventional arises. Our practice moves between typography, code, motion, identity, and interaction—building visual languages that can shift, mutate, and respond.',
  "Our methodology use rules to create variation, code to introduce behaviour, and disorder to make space for the unexpected. The work exists somewhere between graphic design and computation: identities that behave, websites that change, type that moves, and systems that refuse to settle into one form. Disorder Systems is a place for making things that don't quite behave.",
]

// Only one panel is open at a time; opening one closes the other. Clicking the open one closes it.
type Panel = 'intro' | 'about'

export default function App() {
  const [selected, setSelected] = useState<Panel | null>('intro')
  const toggle = (panel: Panel) => setSelected((cur) => (cur === panel ? null : panel))
  const open = selected === 'intro'
  const aboutOpen = selected === 'about'

  return (
    <main className="site">
      <SwarmCanvas />

      <div className="ui" data-swarm-ignore>
        <div className="ui-top">
          <section className={`glass card${open ? '' : ' is-closed'}`}>
            <header className="card-head">
              <h1 className="card-title">Disorder Systems</h1>
              <button
                type="button"
                className={`icon icon-toggle${open ? ' is-open' : ''}`}
                onClick={() => toggle('intro')}
                aria-expanded={open}
                aria-label={open ? 'Collapse intro' : 'Expand intro'}
              />
            </header>
            <div className={`collapse${open ? ' is-open' : ''}`} inert={!open}>
              <div className="collapse-inner">
                <p className="card-body">
                  We are a full-cycle creative studio for technology companies. Experimental creative
                  studio creating one-of-a-kind identities, web and product for startups who wants
                  truely unique identity rather than ai slop
                </p>
              </div>
            </div>
          </section>

          <section className={`glass pill-panel${aboutOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="pill-head"
              onClick={() => toggle('about')}
              aria-expanded={aboutOpen}
              aria-controls="about"
            >
              <span>More about us</span>
              <span className={`icon icon-toggle${aboutOpen ? ' is-open' : ''}`} aria-hidden="true" />
            </button>
            <div className={`collapse${aboutOpen ? ' is-open' : ''}`} inert={!aboutOpen}>
              <div className="collapse-inner">
                <div id="about" className="pill-body">
                  {ABOUT.map((p) => (
                    <p key={p.slice(0, 24)}>{p}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <a href="#work" className="glass pill">
            <span>Work</span>
            <span className="icon icon-plus" aria-hidden="true" />
          </a>
        </div>

        <a href="#contact" className="glass pill">
          <span>Contact</span>
          <span className="icon icon-plus" aria-hidden="true" />
        </a>
      </div>
    </main>
  )
}
