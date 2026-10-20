import {docsHref} from './docs/navigation';
import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Bot, Copy, Check, Code2, Globe, Plus, Minus, Plug, Github} from 'lucide-react';
import '@fontsource-variable/urbanist';
import {mascots, featured} from './mascots';
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

const heroMoods = featured.heroExpressions || [];
const integrationTabs = [
  {id: 'html', label: 'HTML', icon: Globe},
  {id: 'js', label: 'JavaScript', icon: Code2},
  {id: 'react', label: 'React', icon: Code2},
  {id: 'agent', label: 'AI agent', icon: Bot},
];

const faqs = [
  {
    question: 'Is it free for commercial projects?',
    answer: <>Yes. Mascotty is released under the MIT license. You can use, modify and distribute it in personal or commercial projects. Include the copyright and license notice when distributing copies. <a href={docsHref('license')}>Read the license.</a></>,
  },
  {
    question: 'Does Mascotty include an AI assistant?',
    answer: 'Mascotty provides the animated character and its controls. Your app supplies the assistant, text-to-speech and events. The studio includes browser speech and microphone previews so you can try supported reactions.',
  },
  {
    question: 'How do I add a mascot to my site?',
    answer: <>Customise a character in the studio, select “Use on your site”, and copy the HTML or React example with your settings. The mascot renders inside an iframe. <a href={notes}>Follow the quick start.</a></>,
  },
  {
    question: 'What browsers and devices can run it?',
    answer: 'Use a recent browser with WebGL and hardware acceleration. Performance depends on the character and device; detailed models can be demanding on smaller devices. Motion can be paused, and your app can display a still image as a fallback.',
  },
  {
    question: 'Where does microphone audio go?',
    answer: 'The studio measures audio levels in your browser to animate supported characters. Mascotty does not record or upload microphone audio. The microphone preview needs HTTPS and your permission. Browser speech may use your browser’s voice service.',
  },
  {
    question: 'Do all characters have the same controls?',
    answer: <>Each character has its own expressions, states and appearance settings. Your app can send supported states such as listening or speaking, and audio levels for speech reactions. <a href={docsHref('characters')}>Compare character capabilities.</a></>,
  },
  {
    question: 'Can I host it myself?',
    answer: <>Yes. Build the project from source and publish the static files on your own host. You can use the hosted demo to get started or serve your own copy. <a href={docsHref('deployment')}>See the deployment guide.</a></>,
  },
];

const nav = [
  {href: '#cast', label: 'Characters'},
  {href: '#developers', label: 'Integration'},
  {href: '#community', label: 'Community'},
  {href: '#ask', label: 'FAQ'},
  {href: notes, label: 'Docs'},
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
  const [posterPainted, setPosterPainted] = useState(false);
  const heroPoster = useRef(null);
  const [heroExpression, setHeroExpression] = useState(featured.heroProps?.expression);
  const [copied, setCopied] = useState(false);
  const [devTab, setDevTab] = useState('html');
  const [menu, setMenu] = useState(false);
  const root = useRef(null);
  const stage = useRef(null);
  const footer = useRef(null);
  const [footerNear, setFooterNear] = useState(false);
  const [footerMarkReady, setFooterMarkReady] = useState(false);

  useEffect(() => {
    const image = heroPoster.current;
    let cancelled = false, first = 0, second = 0;
    const paint = async () => {
      try { await image.decode(); } catch { /* A failed poster must not prevent the live preview. */ }
      if (cancelled) return;
      // Give the lightweight image a complete paint before building the WebGL scene.
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => { if (!cancelled) setPosterPainted(true); });
      });
    };
    if (image.complete) paint();
    else { image.addEventListener('load', paint, {once: true}); image.addEventListener('error', paint, {once: true}); }
    return () => {
      cancelled = true;
      cancelAnimationFrame(first); cancelAnimationFrame(second);
      image.removeEventListener('load', paint); image.removeEventListener('error', paint);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if(entry.isIntersecting && !matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData) setHeroVisible(true); });
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
    if (!nodes?.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
    root.current.classList.add('has-motion');
    nodes.forEach(el => observer.observe(el));
    const page = root.current;
    return () => { observer.disconnect(); page.classList.remove('has-motion'); };
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
            <a className="lp-ghost" href={studioHref(featured)}>
              Open studio
            </a>
          </div>
        </header>
      </div>

      <main id="main-content" tabIndex={-1}>
        <div className="lp-frame">
          <section className="lp-hero" aria-labelledby="hero-title">
            <h1 id="hero-title" className="lp-title" aria-label="3D mascots for your website">
              <span className="lp-line one">
                3D mascots
                <a className="lp-pill" href={studioHref(sidekick)} aria-label={`Open ${sidekick.name}`} style={{background: sidekick.tint}}>
                  <img src={asset(sidekick.image)} alt="" width="736" height="736" />
                </a>
              </span>
              <span className="lp-line two">
                <span className="lp-for">for your</span>
                website
              </span>
            </h1>

            <div className="lp-stage" data-ready={heroReady} ref={stage}>
              <div className="lp-glow" />
              <img ref={heroPoster} aria-hidden={heroReady} className="lp-stage-still" src={asset(featured.heroPoster || featured.image)} alt={featured.heroPosterAlt || featured.imageAlt} fetchPriority="high" width="768" height="768" />
              {Hero && hero3D && heroVisible && posterPainted ? (
                <Suspense fallback={null}>
                  <Hero {...featured.heroProps} expression={heroExpression} onReady={() => setHeroReady(true)} onError={() => {setHero3D(false);setHeroReady(false)}} />
                </Suspense>
              ) : null}
            </div>

            <p className="lp-lede">
              Free, open-source characters for websites and apps. Customise a mascot, copy an embed, and connect it to your app’s events.
            </p>

            <div className="lp-widget">
              <p>Try an expression</p>
              <div className="lp-mood-buttons" role="group" aria-label={`${featured.name} preview expressions`}>
                {heroMoods.map(mood => <button key={mood.id} type="button" disabled={!heroReady || !hero3D}
                  aria-pressed={heroExpression === mood.id} onClick={() => setHeroExpression(mood.id)}>{mood.label}</button>)}
              </div>
              <a className="lp-link" href={studioHref(featured)}>Explore {featured.name}’s controls <ArrowUpRight size={14} /></a>
            </div>

            <a className="lp-cta" href={studioHref(featured)}>
              Open studio
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
                    {mascots.length} {mascots.length === 1 ? 'character' : 'characters'}
                  </strong>
                  <span>to customise</span>
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
              <p>Free &amp; open source</p>
              <strong className="lp-big">MIT</strong>
              <p>Use it in personal or commercial projects.</p>
              <a className="lp-ghost small" href={docsHref('license')}>
                Read the license <ArrowUpRight size={15} />
              </a>
            </article>
          </section>
        </div>

      <section className="lp-section" id="cast" aria-labelledby="cast-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">The characters</p>
          <h2 id="cast-title">Choose your character</h2>
          <p className="lp-sub">{say(mascots.length)} characters, each with its own look and controls. <a href={docsHref('characters')}>Compare capabilities.</a></p>
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

      <div id="session" aria-hidden="true" />

      <section className="lp-section lp-dev" id="developers" aria-labelledby="dev-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">For developers</p>
          <h2 id="dev-title">Add a mascot to your site</h2>
          <p className="lp-sub">Start with an HTML embed or React component. No account is needed to try the studio.</p>
        </div>
        <div className="lp-dev-grid">
          <ol className="lp-dev-steps">
            <li className="lp-dev-step" data-reveal>
              <span className="lp-dev-n">1</span>
              <div>
                <h3>Customise</h3>
                <p>Choose a character and adjust its supported settings. The studio saves your changes in this browser.</p>
                <a className="lp-link" href={studioHref(featured)}>
                  Open studio <ArrowUpRight size={15} />
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
                <h3>Connect your events</h3>
                <p>
                  Send the states and expressions your character supports. Connect audio levels for speech reactions, or use the generated prompt with your coding agent.
                </p>
                <button type="button" className="lp-link" onClick={() => copy(agentPrompt(featured), 'agent-quick')}>
                  {copied === 'agent-quick' ? 'Prompt copied' : 'Copy the AI-agent prompt'} <Bot size={15} />
                </button>
              </div>
            </li>
          </ol>

          <div className="lp-code" data-reveal>
            <div className="lp-code-bar">
              <div className="lp-code-tabs" role="tablist" aria-label="Integration code" onKeyDown={event => {
                const current = integrationTabs.findIndex(tab => tab.id === devTab);
                const next = event.key === 'ArrowRight' ? (current + 1) % integrationTabs.length : event.key === 'ArrowLeft' ? (current + integrationTabs.length - 1) % integrationTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? integrationTabs.length - 1 : -1;
                if (next < 0) return;
                event.preventDefault();
                setDevTab(integrationTabs[next].id);
                event.currentTarget.querySelectorAll('[role="tab"]')[next].focus();
              }}>
                {integrationTabs.map(t => (
                  <button key={t.id} id={`dev-tab-${t.id}`} aria-controls="dev-code-panel" type="button" role="tab" tabIndex={devTab === t.id ? 0 : -1} aria-selected={devTab === t.id} onClick={() => setDevTab(t.id)}>
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
              <Globe size={14} /> Example for {featured.name}. Customise your embed in the studio.
              <a href={notes}>Read the integration guide <ArrowUpRight size={14} /></a>
            </p>
          </div>
        </div>
      </section>

      <section className="lp-section lp-faq" id="ask" aria-labelledby="faq-title">
        <div className="lp-head" data-reveal>
          <p className="lp-kicker">FAQ</p>
          <h2 id="faq-title">Before you build</h2>
          <p className="lp-sub">Licensing, setup and what to expect from the characters.</p>
        </div>
        <div className="lp-faq-list" data-reveal>
          {faqs.map(item => <details key={item.question} className="lp-faq-item">
            <summary>{item.question}<Plus className="lp-faq-plus" size={18} aria-hidden="true" /><Minus className="lp-faq-minus" size={18} aria-hidden="true" /></summary>
            <p>{item.answer}</p>
          </details>)}
        </div>
      </section>

      <section className="lp-community lp-section" id="community" aria-labelledby="community-title">
        <div className="lp-community-story" data-reveal>
          <h2 id="community-title">Open source.<br />Built together.</h2>
          <p>Mascotty is an open-source project for developers, designers and character makers. Use it in your work and help shape what comes next.</p>
          <img className="lp-community-mark" src={asset('mascotty-logo.webp')} alt="" width="240" height="240" loading="lazy" />
        </div>
        <div className="lp-community-invite" data-reveal>
          <h3>Help build the next character.</h3>
          <p>Contribute a character, improve an expression, test an integration or clarify a guide. The contributor documentation explains how to get started.</p>
          <p className="lp-community-license">MIT licensed. Keep the copyright and license notice when distributing copies.</p>
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

      </main>

      <footer className="lp-footer" id="footer" ref={footer}>
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div data-reveal>
              <h2>Give your app<br />a character.</h2>
              <p>Choose a mascot, make it yours, and add it to your site.</p>
            </div>
            <a className="lp-cta" href={studioHref(featured)}>Open studio <ArrowUpRight size={20} /></a>
          </div>
          <div className="lp-footer-links">
            <a className="lp-logo" href="#home" aria-label="Mascotty home">
              <img src={asset('mascotty-logo.webp')} alt="" width="38" height="38" />
              <span>Mascotty<small>Open-source 3D mascots.</small></span>
            </a>
            <nav aria-label="Explore Mascotty">
              <h3>Meet the cast</h3>
              {mascots.map(m => <a key={m.id} href={studioHref(m)}>{m.name} <ArrowUpRight size={14} /></a>)}
            </nav>
            <nav aria-label="Developer resources">
              <h3>Developers</h3>
              <a href={notes}>Quick start</a>
              <a href={docsHref('api')}>API reference</a>
              <a href={`${repositoryUrl}/tree/main/visage`} target="_blank" rel="noreferrer">Source code <ArrowUpRight size={14} /></a>
            </nav>
            <nav aria-label="Community resources">
              <h3>Community</h3>
              <a href="#community">Get involved</a>
              <a href={docsHref('contributing')}>Contribute <ArrowUpRight size={14} /></a>
              <a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer">Ideas & issues <ArrowUpRight size={14} /></a>
            </nav>
          </div>
          <div className={`lp-wordmark${footerMarkReady ? ' is-ready' : ''}`} aria-hidden="true">
            <span>Mascotty</span>
            {footerNear ? <Suspense fallback={null}>
              <FooterWordmark onReady={setFooterMarkReady} />
            </Suspense> : null}
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Mascotty. Made for the community.</span>
            <a href={repositoryUrl} target="_blank" rel="noreferrer"><Github size={16} /> Source on GitHub</a>
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
