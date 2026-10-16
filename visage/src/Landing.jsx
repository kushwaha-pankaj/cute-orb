import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import './Landing.css';

const LiveMallow = lazy(() => import('./LiveMallow'));
const asset = name => `${import.meta.env.BASE_URL}images/${name}`;

const cast = [
  {
    id: 'portrait',
    name: 'Portrait',
    material: 'Pixel dust',
    image: 'portrait.png',
    alt: 'Particle portrait presence rendered in the Visage studio',
    fact: 'Face to orb · reacts to voice',
    disc: '#06525c',
    href: '#studio/portrait',
  },
  {
    id: 'blob',
    name: 'Green Blob',
    material: 'Soft clay',
    image: 'blob.png',
    alt: 'Green three-dimensional blob mascot with a wide grin',
    fact: 'Eight looks · parts you can hide',
    disc: '#0a6b78',
    href: '#studio/blob',
  },
  {
    id: 'mallow',
    name: 'Mallow',
    material: 'Wool and attitude',
    image: 'mallow.png',
    alt: 'Mallow the ivory wool sheep in the Visage studio',
    fact: '24 moods · 7 AI states · 5 poses',
    disc: '#14808c',
    href: '#studio/mallow',
    liveImage: 'mallow-happy.png',
  },
];

const folders = [
  {id: 'cast', label: 'The cast', tone: 'paper'},
  {id: 'session', label: 'A session', tone: 'soft'},
  {id: 'cue', label: 'The cue', tone: 'mid'},
  {id: 'ask', label: 'Ask away', tone: 'deep'},
  {id: 'studio', label: 'Studio', tone: 'ink', href: '#studio/mallow'},
];

const sessionSteps = [
  {
    title: 'Choose',
    clause: 'First you pick a face.',
    card: {label: 'Presence', value: 'Mallow', note: 'Wool · expressive'},
  },
  {
    title: 'Shape',
    clause: 'Then you find its mood.',
    card: {label: 'Expression', value: 'Curious', note: 'Gaze · mouth · pose'},
  },
  {
    title: 'Export',
    clause: 'You leave with settings.',
    card: {label: 'Export', value: 'JSON', note: 'PNG capture for Mallow'},
  },
  {
    title: 'Plug in',
    clause: 'Your events drive the face.',
    card: {label: 'Controller', value: 'mallow.setState', note: 'Listening · speaking'},
  },
];

const faqs = [
  {
    tab: 'Product',
    question: 'Is Visage an AI assistant?',
    answer:
      'Visage is a visual character studio. The demos run without an account or API key. You connect your own assistant or app events to drive the controller.',
  },
  {
    tab: 'Browser',
    question: 'What do I need to run it?',
    answer:
      'A recent browser with WebGL and hardware acceleration. Mallow is detailed and prefers a desktop GPU. Microphone access needs HTTPS or localhost.',
  },
  {
    tab: 'Mic',
    question: 'Where does microphone audio go?',
    answer:
      'Levels are measured in your browser to animate the mouth. This app does not record or upload microphone audio. Browser speech may use your browser’s voice service.',
  },
  {
    tab: 'Export',
    question: 'What can I take away?',
    answer:
      'Each studio exports settings as JSON. Mallow can also capture a PNG. The procedural sheep is not a rigged GLB export.',
  },
  {
    tab: 'Code',
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

export default function Landing({onNotice, notice}) {
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const root = useRef(null);
  const current = cast[active];

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
    <div className="exhibit" ref={root}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="ex-header">
        <a className="ex-mark" href="#home" aria-label="Visage home">
          visage
          <span className="ex-dot" aria-hidden="true" />
        </a>
        <button
          className="ex-menu"
          aria-expanded={menu}
          aria-controls="ex-nav"
          onClick={() => setMenu(m => !m)}
        >
          {menu ? 'Close' : 'Menu'}
        </button>
        <nav id="ex-nav" className={menu ? 'is-open' : ''} aria-label="Main" onClick={() => setMenu(false)}>
          <a href="#cast">The cast</a>
          <a href="#session">A session</a>
          <a href="#ask">Ask away</a>
        </nav>
        <a className="ex-header-cta" href="#studio/mallow">
          Enter studio <ArrowUpRight size={16} />
        </a>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="ex-hero" aria-labelledby="hero-title">
          <div className="ex-motif" aria-hidden="true" />
          <div className="ex-hero-copy">
            <h1 id="hero-title">VISAGE</h1>
            <p>Soft faces for sharp systems.</p>
          </div>

          <div className="ex-folders" data-ui>
            {folders.map((folder, index) => {
              const Tag = folder.href ? 'a' : 'div';
              return (
                <Tag
                  key={folder.id}
                  className={`ex-folder tone-${folder.tone} ${index === folders.length - 1 ? 'is-front' : ''}`}
                  href={folder.href}
                  style={{'--i': index}}
                >
                  <span className="ex-folder-tab">{folder.label}</span>
                  {index === folders.length - 1 && (
                    <span className="ex-folder-action">
                      Open Mallow <ArrowUpRight size={18} />
                    </span>
                  )}
                </Tag>
              );
            })}
          </div>
        </section>

        <section className="ex-cast" id="cast" aria-labelledby="cast-title">
          <div className="ex-cast-layout">
            <ol className="ex-cast-list" data-reveal>
              <li className="ex-cast-heading" id="cast-title">
                Meet the cast
              </li>
              {cast.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={active === index ? 'is-active' : ''}
                    aria-pressed={active === index}
                    onClick={() => {
                      setActive(index);
                      setLive(false);
                    }}
                    onMouseEnter={() => {
                      if (!matchMedia('(hover: none)').matches) {
                        setActive(index);
                        setLive(false);
                      }
                    }}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ol>

            <div className="ex-disc-stage" data-reveal style={{'--disc': current.disc}}>
              <div className="ex-disc" aria-hidden="true" />
              <div className="ex-disc-object" key={current.id}>
                {live && current.id === 'mallow' ? (
                  <Suspense fallback={<p className="ex-live-wait">Warming wool…</p>}>
                    <LiveMallow expression="joyful" onError={message => {onNotice(message); setLive(false);}} />
                  </Suspense>
                ) : (
                  <img
                    src={asset(live && current.liveImage ? current.liveImage : current.image)}
                    alt={current.alt}
                    width="655"
                    height="880"
                  />
                )}
              </div>
              <p className="ex-disc-fact">{current.fact}</p>
              <div className="ex-disc-actions" data-ui>
                <a className="ex-button" href={current.href}>
                  Open {current.name} <ArrowUpRight size={18} />
                </a>
                {current.id === 'mallow' && (
                  <button type="button" className="ex-text-btn" onClick={() => setLive(v => !v)}>
                    {live ? 'Still frame' : 'Bring to life'}
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="ex-cast-material" data-reveal>
            {current.material}. Same invitation: make it move.
          </p>
          <div className="ex-cast-strip" data-reveal aria-hidden="true">
            {cast.map(item => (
              <img key={item.id} src={asset(item.image)} alt="" width="88" height="88" loading="lazy" />
            ))}
            <img src={asset('mallow-hero.png')} alt="" width="88" height="88" loading="lazy" />
          </div>
        </section>

        <section className="ex-session" id="session" aria-labelledby="session-title">
          <div className="ex-session-grid">
            {sessionSteps.map((step, index) => (
              <article className={`ex-session-field tone-${index}`} key={step.title} data-reveal style={{'--delay': `${index * 70}ms`}}>
                {index === 0 && <h2 id="session-title">A session</h2>}
                <p className="ex-session-clause">{step.clause}</p>
                <div className="ex-session-card" data-ui>
                  <span>{step.card.label}</span>
                  <strong>{step.card.value}</strong>
                  <small>{step.card.note}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ex-cue" id="cue" aria-labelledby="cue-title">
          <div className="ex-cue-copy" data-reveal>
            <h2 id="cue-title">Give it a cue</h2>
            <p>You bring the events. Mallow brings the face.</p>
            <a className="ex-text-btn" href="#studio/mallow">
              Try it in studio <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="ex-code" data-ui data-reveal>
            <div className="ex-code-bar">
              <span>mallow · javascript</span>
              <button type="button" onClick={copyCode}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre>
              <code>{code}</code>
            </pre>
            <a href={`${import.meta.env.BASE_URL}integration.md`} download>
              Integration notes
            </a>
          </div>
          <figure className="ex-cue-pic" data-reveal>
            <img src={asset('mallow-happy.png')} alt="Mallow with a brighter expression" width="655" height="880" loading="lazy" />
          </figure>
          <figure className="ex-cue-film" data-reveal>
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={`${import.meta.env.BASE_URL}media/clay-wheel-poster.jpg`}
              width="608"
              height="1080"
              aria-label="Pottery wheel forming soft clay, atmosphere for the clay blob"
            >
              <source src={`${import.meta.env.BASE_URL}media/clay-wheel.webm`} type="video/webm" />
            </video>
          </figure>
        </section>

        <section className="ex-faq" id="ask" aria-labelledby="faq-title">
          <h2 id="faq-title" data-reveal>
            Ask away
          </h2>
          <div className="ex-faq-stack" data-reveal>
            {faqs.map((item, index) => (
              <button
                type="button"
                key={item.tab}
                className={`ex-faq-card tone-${index % 3} ${openFaq === index ? 'is-open' : ''}`}
                style={{'--i': index}}
                aria-expanded={openFaq === index}
                onClick={() => setOpenFaq(index)}
              >
                <span className="ex-faq-tab">{item.tab}</span>
                <span className="ex-faq-q">{item.question}</span>
                {openFaq === index && <span className="ex-faq-a">{item.answer}</span>}
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="ex-footer">
        <div className="ex-wordmark" aria-label="Visage">
          {'VISAGE'.split('').map((letter, index) => (
            <span key={letter + index} style={{'--h': `${70 + (index % 3) * 15}%`}}>
              {letter}
            </span>
          ))}
        </div>
        <div className="ex-footer-links">
          <a href="#studio/portrait">Open Portrait</a>
          <a href="#studio/blob">Open Green Blob</a>
          <a href="#studio/mallow">Open Mallow</a>
          <a href="#ask">Ask away</a>
          <a href={`${import.meta.env.BASE_URL}integration.md`} download>
            Integration notes
          </a>
          <p>React · Three.js · your events</p>
          <p>No account. No invented AI backend.</p>
        </div>
        <div className="ex-footer-end">
          <span>© {new Date().getFullYear()} Visage</span>
          <a className="ex-button small" href="#studio/mallow">
            Meet your presence <ArrowUpRight size={16} />
          </a>
        </div>
        <p className="credits">
          Footage:{' '}
          <a href="https://commons.wikimedia.org/wiki/File:%D0%93%D1%80%D0%BD%D1%87%D0%B0%D1%80%D1%81%D0%BA%D0%BE_%D0%BA%D0%BE%D0%BB%D1%86%D0%B5.webm">
            “Грнчарско колце”
          </a>{' '}
          by Lili Arsova, <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0</a>, via Wikimedia Commons.
        </p>
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
