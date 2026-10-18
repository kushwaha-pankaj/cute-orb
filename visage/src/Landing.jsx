import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {ArrowUpRight, AudioLines, Copy, Check, Plus, Minus} from 'lucide-react';
import '@fontsource-variable/urbanist';
import './Landing.css';

const HeroMallow = lazy(() => import('./HeroMallow'));
const LiveMallow = lazy(() => import('./LiveMallow'));
const asset = name => `${import.meta.env.BASE_URL}images/${name}`;
const notes = `${import.meta.env.BASE_URL}integration.md`;

const cast = [
  {
    id: 'mallow',
    name: 'Mallow',
    material: 'Wool and attitude',
    image: 'mallow-happy.png',
    alt: 'Mallow the ivory wool sheep with arms crossed',
    fact: '24 moods · 7 AI states · 5 poses',
    tint: '#d4cac0',
    href: '#studio/mallow',
  },
  {
    id: 'blob',
    name: 'Green Blob',
    material: 'Soft clay',
    image: 'blob.png',
    alt: 'Green three-dimensional blob mascot with a wide grin',
    fact: 'Eight looks · parts you can hide',
    tint: '#9cc08f',
    href: '#studio/blob',
  },
  {
    id: 'portrait',
    name: 'Portrait',
    material: 'Pixel dust',
    image: 'portrait.png',
    alt: 'Particle portrait presence glowing blue on black',
    fact: 'Face to orb · reacts to voice',
    tint: '#121212',
    dark: true,
    href: '#studio/portrait',
  },
];

const visemes = [
  {key: 'A', h: 72},
  {key: 'E', h: 44},
  {key: 'O', h: 88},
  {key: 'U', h: 52},
  {key: 'M', h: 26},
  {key: 'F', h: 38},
];

const sessionSteps = [
  {title: 'Choose', clause: 'Pick a face for your product.', chip: 'Mallow'},
  {title: 'Shape', clause: 'Dial in gaze, mouth and pose.', chip: 'curious · 0.8'},
  {title: 'Export', clause: 'Leave with settings as JSON.', chip: 'mallow.json'},
  {title: 'Plug in', clause: 'Your app events drive the face.', chip: "setState('speaking')"},
];

const faqs = [
  {
    question: 'Is Visage an AI assistant?',
    answer:
      'Visage is a visual character studio. The demos run without an account or API key. You connect your own assistant or app events to drive the controller.',
  },
  {
    question: 'What do I need to run it?',
    answer:
      'A recent browser with WebGL and hardware acceleration. Mallow is detailed and prefers a desktop GPU. Microphone access needs HTTPS or localhost.',
  },
  {
    question: 'Where does microphone audio go?',
    answer:
      'Levels are measured in your browser to animate the mouth. This app does not record or upload microphone audio. Browser speech may use your browser’s voice service.',
  },
  {
    question: 'What can I take away?',
    answer:
      'Each studio exports settings as JSON. Mallow can also capture a PNG. The procedural sheep is not a rigged GLB export.',
  },
  {
    question: 'How do I drive Mallow?',
    answer:
      'Open the Mallow studio, then call window.mallow from your page or console. setState, setExpression, setGaze, setViseme and setAudioLevel cover the common cues.',
  },
];

const code = `mallow.setState('listening');
mallow.setExpression('curious', 0.8);
mallow.setGaze(0.3, 0.2);

mallow.setState('speaking');
mallow.setViseme('O');
mallow.setAudioLevel(0.6);`;

const nav = [
  {href: '#home', label: 'Home'},
  {href: '#cast', label: 'Cast'},
  {href: '#session', label: 'Session'},
  {href: '#cue', label: 'Code'},
  {href: '#ask', label: 'FAQ'},
];

function canRender3D() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export default function Landing({onNotice, notice}) {
  const [live, setLive] = useState(false);
  const [hero3D, setHero3D] = useState(canRender3D);
  const [openFaq, setOpenFaq] = useState(0);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    const nodes = root.current?.querySelectorAll('[data-reveal]');
    if (!nodes?.length) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      {threshold: 0.12},
    );
    nodes.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onNotice('Select the code and copy it with your keyboard.');
    }
  }

  return (
    <div className="lp" ref={root}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="lp-frame">
        <header className="lp-header">
          <a className="lp-logo" href="#home" aria-label="Visage home">
            <img src={asset('mallow-happy.png')} alt="" width="34" height="34" />
            Visage
          </a>
          <button
            className="lp-menu"
            aria-expanded={menu}
            aria-controls="lp-nav"
            onClick={() => setMenu(m => !m)}
          >
            {menu ? 'Close' : 'Menu'}
          </button>
          <nav id="lp-nav" className={menu ? 'is-open' : ''} aria-label="Main" onClick={() => setMenu(false)}>
            {nav.map((item, index) => (
              <a key={item.href} href={item.href} aria-current={index === 0 ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="lp-header-end">
            <a className="lp-link" href={notes} download>
              Docs
            </a>
            <a className="lp-ghost" href="#studio/mallow">
              Enter studio
            </a>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          <section className="lp-hero" aria-labelledby="hero-title">
            <h1 id="hero-title" className="lp-title">
              <span className="lp-line one">
                Soft Faces
                <a className="lp-pill" href="#studio/blob" aria-label="Open Green Blob">
                  <img src={asset('blob.png')} alt="" width="736" height="736" />
                </a>
              </span>
              <span className="lp-line two">
                <span className="lp-for">for sharp</span>
                Systems
              </span>
            </h1>

            <div className="lp-stage" aria-hidden={!hero3D}>
              <div className="lp-glow" />
              {hero3D ? (
                <Suspense fallback={null}>
                  <HeroMallow expression="excited" pose="wave" onError={() => setHero3D(false)} />
                </Suspense>
              ) : (
                <img className="lp-stage-still" src={asset('mallow-happy.png')} alt="Mallow the sheep" />
              )}
            </div>

            <p className="lp-lede">
              Expressive 3D characters for your assistant or app. Pick a face, give it a mood, and let your
              own events make it listen, think and speak.
            </p>

            <figure className="lp-widget" aria-label="Lip sync visemes Mallow can show">
              <figcaption>Lip sync</figcaption>
              <div className="lp-bars">
                {visemes.map((v, i) => (
                  <div key={v.key} className="lp-bar">
                    <span className={i % 3 === 2 ? 'blue' : ''} style={{'--h': `${v.h}%`, '--d': `${i * 0.18}s`}} />
                    <small>{v.key}</small>
                  </div>
                ))}
              </div>
            </figure>

            <a className="lp-cta" href="#studio/mallow">
              Get started
            </a>
          </section>

          <section className="lp-row" aria-label="Highlights">
            <article className="lp-card pink" data-reveal>
              <a className="lp-tile" href="#studio/blob" aria-label="Open Green Blob studio">
                <img src={asset('blob.png')} alt="" width="736" height="736" loading="lazy" />
              </a>
              <div className="lp-card-body">
                <p className="lp-score">
                  <strong>3 faces</strong>
                  <span>ready to drive</span>
                </p>
                <ul className="lp-people">
                  {cast.map(item => (
                    <li key={item.id}>
                      <a href={item.href}>
                        <img src={asset(item.image)} alt="" width="44" height="44" loading="lazy" style={{background: item.tint}} />
                        <span>
                          <b>{item.name}</b>
                          {item.fact}
                        </span>
                        <em>{item.material}</em>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="lp-card lilac" data-reveal>
              <span className="lp-icon" aria-hidden="true">
                <AudioLines size={22} />
              </span>
              <p>Moods you can call from code</p>
              <strong className="lp-big">24</strong>
              <a className="lp-ghost small" href={notes} download>
                Read the notes <ArrowUpRight size={15} />
              </a>
            </article>
          </section>
        </main>
      </div>

      <section className="lp-section" id="cast" aria-labelledby="cast-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">The cast</p>
          <h2 id="cast-title">Three faces, one controller</h2>
        </div>
        <div className="lp-cast">
          {cast.map((item, index) => (
            <article
              key={item.id}
              className={`lp-cast-card ${item.dark ? 'dark' : ''}`}
              style={{'--tint': item.tint, '--delay': `${index * 80}ms`}}
              data-reveal
            >
              <div className="lp-cast-art">
                {live && item.id === 'mallow' ? (
                  <Suspense fallback={<p className="lp-wait">Warming wool…</p>}>
                    <LiveMallow
                      expression="joyful"
                      background={item.tint}
                      onError={message => {
                        onNotice(message);
                        setLive(false);
                      }}
                    />
                  </Suspense>
                ) : (
                  <img src={asset(item.image)} alt={item.alt} width="655" height="880" loading="lazy" />
                )}
              </div>
              <div className="lp-cast-info">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.material}</p>
                </div>
                <small>{item.fact}</small>
                <div className="lp-cast-actions">
                  <a className="lp-cta small" href={item.href}>
                    Open studio <ArrowUpRight size={16} />
                  </a>
                  {item.id === 'mallow' && (
                    <button type="button" className="lp-link" onClick={() => setLive(v => !v)}>
                      {live ? 'Still frame' : 'Bring to life'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section" id="session" aria-labelledby="session-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">A session</p>
          <h2 id="session-title">From a blank face to a live one</h2>
        </div>
        <ol className="lp-steps">
          {sessionSteps.map((step, index) => (
            <li key={step.title} className={`lp-step t${index}`} data-reveal style={{'--delay': `${index * 70}ms`}}>
              <span className="lp-step-n">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.clause}</p>
              <code>{step.chip}</code>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-section lp-cue" id="cue" aria-labelledby="cue-title">
        <div className="lp-code" data-reveal>
          <div className="lp-code-bar">
            <span className="lp-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>mallow.js</span>
            <button type="button" onClick={copyCode} aria-label="Copy code">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
        <div className="lp-cue-card" data-reveal>
          <img src={asset('mallow-sassy.png')} alt="Mallow giving a sideways, knowing look" width="630" height="700" loading="lazy" />
          <div>
            <p className="lp-kicker">The cue</p>
            <h2 id="cue-title">You bring the events. Mallow brings the face.</h2>
            <div className="lp-cast-actions">
              <a className="lp-cta small" href="#studio/mallow">
                Try it in studio <ArrowUpRight size={16} />
              </a>
              <a className="lp-link" href={notes} download>
                Integration notes
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-faq" id="ask" aria-labelledby="faq-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">Ask away</p>
          <h2 id="faq-title">Good questions</h2>
          <p className="lp-sub">No account. No invented AI backend. Just faces you can direct.</p>
        </div>
        <div className="lp-faq-list" data-reveal>
          {faqs.map((item, index) => {
            const open = openFaq === index;
            return (
              <div key={item.question} className={`lp-faq-item ${open ? 'is-open' : ''}`}>
                <button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? -1 : index)}>
                  {item.question}
                  {open ? <Minus size={18} /> : <Plus size={18} />}
                </button>
                {open && <p>{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-band" data-reveal>
          <div>
            <h2>Meet your presence</h2>
            <p>Open a studio and make it move in under a minute.</p>
            <a className="lp-cta" href="#studio/mallow">
              Get started
            </a>
          </div>
          <div className="lp-band-faces" aria-hidden="true">
            {cast.map(item => (
              <img key={item.id} src={asset(item.image)} alt="" style={{background: item.tint}} loading="lazy" />
            ))}
          </div>
        </div>
        <div className="lp-foot">
          <a className="lp-logo" href="#home">
            <img src={asset('mallow-happy.png')} alt="" width="34" height="34" />
            Visage
          </a>
          <nav aria-label="Footer">
            <a href="#studio/portrait">Portrait</a>
            <a href="#studio/blob">Green Blob</a>
            <a href="#studio/mallow">Mallow</a>
            <a href={notes} download>
              Integration notes
            </a>
          </nav>
          <span>© {new Date().getFullYear()} Visage · React · Three.js</span>
        </div>
      </footer>

      {notice && (
        <div className="toast" role="status">
          {notice}
          <button type="button" onClick={() => onNotice('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
