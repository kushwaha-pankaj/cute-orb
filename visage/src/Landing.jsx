import {docsHref} from './docs/navigation';
import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {ArrowUpRight, AudioLines, Bot, Copy, Check, Code2, Globe, Plus, Minus, Plug, Github} from 'lucide-react';
import '@fontsource-variable/urbanist';
import {mascots, featured, totalMoods} from './mascots';
import {agentPrompt, htmlSnippet, jsSnippet, reactSnippet} from './integration';
import {repositoryUrl} from './site';
import './Landing.css';

const FooterWordmark = lazy(() => import('./FooterWordmark'));

const asset = name => `${import.meta.env.BASE_URL}images/${name}`;
const notes = docsHref();
const studioHref = m => `#studio/${m.id}`;
const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const say = n => words[n] || String(n);

// Live renderers come from the registry, one lazy component per mascot that ships one.
const heroes = Object.fromEntries(mascots.filter(m => m.hero).map(m => [m.id, lazy(m.hero)]));
const Hero = heroes[featured.id];
// The headline pill and highlight tile show a second face from the cast.
const sidekick = mascots.find(m => m.id !== featured.id && !m.dark) || featured;
const PEOPLE_LIMIT = 3;

function LiveHero({Component, onError}) {
  return <Component onError={onError} />;
}

const visemes = [
  {key: 'A', h: 72},
  {key: 'E', h: 44},
  {key: 'O', h: 88},
  {key: 'U', h: 52},
  {key: 'M', h: 26},
  {key: 'F', h: 38},
];

const sessionSteps = [
  {title: 'Choose', clause: 'Pick a face for your product.', chip: featured.name},
  {title: 'Shape', clause: 'Dial in gaze, mouth and pose.', chip: 'curious · 0.8'},
  {title: 'Copy', clause: 'Grab a snippet with your settings in it.', chip: 'Use on your site'},
  {title: 'Plug in', clause: 'Your app events drive the face.', chip: "setState('speaking')"},
];

const faqs = [
  {
    question: 'Is Mascotty an AI assistant?',
    answer:
      'Mascotty is a visual character studio. The demos run without an account or API key. You connect your own assistant or app events to drive the controller.',
  },
  {
    question: 'What do I need to run it?',
    answer:
      'A recent browser with WebGL and hardware acceleration. The detailed characters prefer a desktop GPU. Microphone access requires a secure HTTPS connection.',
  },
  {
    question: 'Where does microphone audio go?',
    answer:
      'Levels are measured in your browser to animate the mouth. This app does not record or upload microphone audio. Browser speech may use your browser’s voice service.',
  },
  {
    question: 'How do I add a mascot to my site?',
    answer:
      'Open a studio, press “Use on your site” and paste the snippet: one div and one script tag. The mascot runs in its own frame, so it can’t clash with your CSS or JavaScript. There’s a React component too.',
  },
  {
    question: 'Can my AI coding agent set it up for me?',
    answer:
      'Yes. The studio’s “AI agent” tab gives you a prompt for Claude Code, Cursor or any coding agent. It says where to embed the mascot and how to wire it to your assistant’s listening, thinking and speaking moments.',
  },
  {
    question: 'How does it react to my assistant?',
    answer:
      'Call setState with listening, thinking, speaking or idle from your chat code, and setAudioLevel (0 to 1) from your text-to-speech audio. Each mascot reports its own states, expressions and settings when it’s ready.',
  },
];

const nav = [
  {href: '#home', label: 'Home'},
  {href: '#cast', label: 'Cast'},
  {href: '#session', label: 'Session'},
  {href: '#developers', label: 'Developers'},
  {href: '#community', label: 'Community'},
  {href: '#ask', label: 'FAQ'},
];

export default function Landing({onNotice, notice}) {
  const [live, setLive] = useState(null);
  const [activeHash, setActiveHash] = useState('#home');
  useEffect(() => {
    const sync = () => setActiveHash(location.hash || '#home');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const [hero3D, setHero3D] = useState(true);
  const [heroVisible, setHeroVisible] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [copied, setCopied] = useState(false);
  const [devTab, setDevTab] = useState('html');
  const [menu, setMenu] = useState(false);
  const root = useRef(null);
  const stage = useRef(null);
  const footer = useRef(null);
  const [footerNear, setFooterNear] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if(entry.isIntersecting) setHeroVisible(true); });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setFooterNear(true); observer.disconnect(); }
    }, {rootMargin: '400px'});
    if (footer.current) observer.observe(footer.current);
    return () => observer.disconnect();
  }, []);

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

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onNotice('Select the text and copy it with your keyboard.');
    }
  }

  const devCode = {
    html: htmlSnippet(featured),
    js: jsSnippet(featured),
    react: reactSnippet(featured),
    agent: agentPrompt(featured),
  };

  return (
    <div className="lp" ref={root}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="lp-frame">
        <header className="lp-header">
          <a className="lp-logo" href="#home" aria-label="Mascotty home">
            <img src={asset('mascotty-logo.webp')} alt="" width="34" height="34" />
            Mascotty
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
            {nav.map(item => (
              <a key={item.href} href={item.href} aria-current={activeHash === item.href ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="lp-header-end">
            <a className="lp-link" href={notes}>
              Docs
            </a>
            <a className="lp-ghost" href={studioHref(featured)}>
              Enter studio
            </a>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          <section className="lp-hero" aria-labelledby="hero-title">
            <h1 id="hero-title" className="lp-title">
              <span className="lp-line one">
                Soft Faces
                <a className="lp-pill" href={studioHref(sidekick)} aria-label={`Open ${sidekick.name}`} style={{background: sidekick.tint}}>
                  <img src={asset(sidekick.image)} alt="" width="736" height="736" />
                </a>
              </span>
              <span className="lp-line two">
                <span className="lp-for">for sharp</span>
                Systems
              </span>
            </h1>

            <div className="lp-stage" data-ready={heroReady} ref={stage} aria-hidden={!hero3D}>
              <div className="lp-glow" />
              {!heroReady && <img className="lp-stage-still" src={asset(featured.image)} alt={featured.imageAlt} fetchPriority="high" width="655" height="880" />}
              {Hero && hero3D && heroVisible ? (
                <Suspense fallback={null}>
                  <Hero {...featured.heroProps} onReady={() => setHeroReady(true)} onError={() => {setHero3D(false);setHeroReady(false)}} />
                </Suspense>
              ) : null}
            </div>

            <p className="lp-lede">
              Expressive 3D characters for your assistant or app. Pick a face, give it a mood, and let your
              own events make it listen, think and speak.
            </p>

            <figure className="lp-widget" aria-label={`Lip sync visemes ${featured.name} can show`}>
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

            <a className="lp-cta" href={studioHref(featured)}>
              Get started
            </a>
          </section>

          <section className="lp-row" aria-label="Highlights">
            <article className="lp-card pink" data-reveal>
              <a className="lp-tile" href={studioHref(sidekick)} aria-label={`Open ${sidekick.name} studio`} style={{background: sidekick.tint}}>
                <img src={asset(sidekick.image)} alt="" width="736" height="736" loading="lazy" />
              </a>
              <div className="lp-card-body">
                <p className="lp-score">
                  <strong>
                    {mascots.length} {mascots.length === 1 ? 'face' : 'faces'}
                  </strong>
                  <span>ready to drive</span>
                </p>
                <ul className="lp-people">
                  {mascots.slice(0, PEOPLE_LIMIT).map(item => (
                    <li key={item.id}>
                      <a href={studioHref(item)}>
                        <img src={asset(item.image)} alt="" width="44" height="44" loading="lazy" style={{background: item.tint}} />
                        <span>
                          <b>{item.name}</b>
                          {item.fact}
                        </span>
                        <em>{item.material}</em>
                      </a>
                    </li>
                  ))}
                  {mascots.length > PEOPLE_LIMIT && (
                    <li>
                      <a className="lp-more" href="#cast">
                        +{mascots.length - PEOPLE_LIMIT} more in the cast
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </article>

            <article className="lp-card lilac" data-reveal>
              <span className="lp-icon" aria-hidden="true">
                <AudioLines size={22} />
              </span>
              <p>Moods &amp; states across the cast</p>
              <strong className="lp-big">{totalMoods}</strong>
              <a className="lp-ghost small" href={notes}>
                Developer docs <ArrowUpRight size={15} />
              </a>
            </article>
          </section>
        </main>
      </div>

      <section className="lp-section" id="cast" aria-labelledby="cast-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">The cast</p>
          <h2 id="cast-title">{say(mascots.length)} faces, one studio</h2>
        </div>
        <div className="lp-cast">
          {mascots.map((item, index) => (
            <article
              key={item.id}
              className={`lp-cast-card ${item.dark ? 'dark' : ''}`}
              style={{'--tint': item.tint, '--delay': `${index * 80}ms`}}
              data-reveal
            >
              <div className="lp-cast-art">
                {live === item.id && heroes[item.id] ? (
                  <Suspense fallback={<p className="lp-wait">Warming up…</p>}>
                    <LiveHero
                      Component={heroes[item.id]}
                      onError={message => {
                        onNotice(message);
                        setLive(null);
                      }}
                    />
                  </Suspense>
                ) : (
                  <img src={asset(item.image)} alt={item.imageAlt} width="655" height="880" loading="lazy" />
                )}
              </div>
              <div className="lp-cast-info">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.material}</p>
                </div>
                <small>{item.fact}</small>
                <div className="lp-cast-actions">
                  <a className="lp-cta small" href={studioHref(item)}>
                    Open studio <ArrowUpRight size={16} />
                  </a>
                  {heroes[item.id] && (
                    <button type="button" className="lp-link" onClick={() => setLive(v => (v === item.id ? null : item.id))}>
                      {live === item.id ? 'Still frame' : 'Bring to life'}
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

      <section className="lp-section lp-dev" id="developers" aria-labelledby="dev-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">For developers</p>
          <h2 id="dev-title">Put a face on your product in three steps</h2>
          <p className="lp-sub">One script tag, no build step, no account. Or hand it to your AI coding agent.</p>
        </div>
        <div className="lp-dev-grid">
          <ol className="lp-dev-steps">
            <li className="lp-dev-step" data-reveal>
              <span className="lp-dev-n">1</span>
              <div>
                <h3>Customise</h3>
                <p>Open a studio, pick a mascot and tune its look, mood and motion. Your changes save as you go.</p>
                <a className="lp-link" href={studioHref(featured)}>
                  Open the studio <ArrowUpRight size={15} />
                </a>
              </div>
            </li>
            <li className="lp-dev-step" data-reveal style={{'--delay': '70ms'}}>
              <span className="lp-dev-n">2</span>
              <div>
                <h3>Copy the snippet</h3>
                <p>
                  Press <b><Plug size={13} /> Use on your site</b> for an HTML or React snippet with your settings baked in. Paste it
                  where the mascot should live.
                </p>
              </div>
            </li>
            <li className="lp-dev-step" data-reveal style={{'--delay': '140ms'}}>
              <span className="lp-dev-n">3</span>
              <div>
                <h3>Wire it to your assistant</h3>
                <p>
                  Call <code>setState</code> as your assistant listens, thinks and speaks. Or paste the AI-agent prompt and let your
                  coding agent do the wiring.
                </p>
                <button type="button" className="lp-link" onClick={() => copy(agentPrompt(featured), 'agent-quick')}>
                  {copied === 'agent-quick' ? 'Prompt copied' : 'Copy the AI-agent prompt'} <Bot size={15} />
                </button>
              </div>
            </li>
          </ol>

          <div className="lp-code" data-reveal>
            <div className="lp-code-bar">
              <div className="lp-code-tabs" role="tablist" aria-label="Integration code">
                {[
                  {id: 'html', label: 'HTML', icon: Globe},
                  {id: 'js', label: 'JavaScript', icon: Code2},
                  {id: 'react', label: 'React', icon: Code2},
                  {id: 'agent', label: 'AI agent', icon: Bot},
                ].map(t => (
                  <button key={t.id} id={`dev-tab-${t.id}`} aria-controls="dev-code-panel" type="button" role="tab" aria-selected={devTab === t.id} onClick={() => setDevTab(t.id)}>
                    <t.icon size={13} /> {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="lp-code-copy"
                onClick={() => copy(devCode[devTab], devTab)}
                aria-label="Copy code"
              >
                {copied === devTab ? <Check size={15} /> : <Copy size={15} />}
                {copied === devTab ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre id="dev-code-panel" role="tabpanel" aria-labelledby={`dev-tab-${devTab}`} tabIndex={0}>
              <code>{devCode[devTab]}</code>
            </pre>
            <p className="lp-code-note">
              <Globe size={14} /> Ready for your website · HTML, React or your AI coding agent.
              <a href={notes}>Read the integration guide <ArrowUpRight size={14} /></a>
            </p>
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

      <section className="lp-community lp-section" id="community" aria-labelledby="community-title">
        <div className="lp-community-story" data-reveal>
          <h2 id="community-title">Open source.<br />Shared imagination.</h2>
          <p>Mascotty is for the community. A place for developers, designers and character makers to build a more expressive web, together.</p>
          <img className="lp-community-mark" src={asset('mascotty-logo.webp')} alt="" width="240" height="240" loading="lazy" />
        </div>
        <div className="lp-community-invite" data-reveal>
          <h3>Your ideas belong here.</h3>
          <p>Explore the source, help a character find its next expression, or make the integration better for the next developer. Every thoughtful contribution counts.</p>
          <p className="lp-community-license">MIT licensed. Free to use, change and build on, with attribution.</p>
          <a className="lp-cta" href={repositoryUrl} target="_blank" rel="noreferrer">
            <Github size={19} /> Explore on GitHub <ArrowUpRight size={18} />
          </a>
          <div className="lp-community-paths">
            <a href={docsHref('contributing')}>
              <span>Build with us<small>Start with the contributor guide</small></span><ArrowUpRight size={22} />
            </a>
            <a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer">
              <span>Bring an idea<small>Suggest a feature or report a bug</small></span><ArrowUpRight size={22} />
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-footer" id="footer" ref={footer}>
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div data-reveal>
              <h2>A little character.<br />A lot of possibility.</h2>
              <p>Give your next project a face of its own.</p>
            </div>
            <a className="lp-cta" href={studioHref(featured)}>Make it yours <ArrowUpRight size={20} /></a>
          </div>
          <div className="lp-footer-links">
            <a className="lp-logo" href="#home" aria-label="Mascotty home">
              <img src={asset('mascotty-logo.webp')} alt="" width="38" height="38" />
              <span>Mascotty<small>Soft faces for sharp systems.</small></span>
            </a>
            <nav aria-label="Explore Mascotty">
              <h3>Meet the cast</h3>
              {mascots.map(m => <a key={m.id} href={studioHref(m)}>{m.name} <ArrowUpRight size={14} /></a>)}
            </nav>
            <nav aria-label="Developer resources">
              <h3>Make it work</h3>
              <a href="#developers">Quick start</a>
              <a href={notes}>Integration guide</a>
              <a href={`${repositoryUrl}/tree/main/visage`} target="_blank" rel="noreferrer">Source code <ArrowUpRight size={14} /></a>
            </nav>
            <nav aria-label="Community resources">
              <h3>Make it together</h3>
              <a href="#community">Our community</a>
              <a href={docsHref('contributing')}>Contribute <ArrowUpRight size={14} /></a>
              <a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer">Ideas & issues <ArrowUpRight size={14} /></a>
            </nav>
          </div>
          {footerNear ? <Suspense fallback={<div className="lp-wordmark" aria-hidden="true"><span>Mascotty</span></div>}>
            <FooterWordmark />
          </Suspense> : <div className="lp-wordmark" aria-hidden="true"><span>Mascotty</span></div>}
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Mascotty. Made for the community.</span>
            <a href={repositoryUrl} target="_blank" rel="noreferrer"><Github size={16} /> Open source, open possibilities.</a>
            <a href={docsHref('license')}>MIT licensed</a>
            <a href="#home">Back to top ↑</a>
          </div>
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
