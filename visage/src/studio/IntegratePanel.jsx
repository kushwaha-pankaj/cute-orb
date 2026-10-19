import {useEffect, useMemo, useRef, useState} from 'react';
import {Bot, Check, Code2, Copy, Download, Globe, Link2, Settings2, X} from 'lucide-react';
import {
  agentPrompt,
  changedSettings,
  encodeConfig,
  htmlSnippet,
  jsSnippet,
  reactSnippet,
  studioLink,
} from '../integration';

const TABS = [
  {id: 'web', label: 'Website', icon: Globe},
  {id: 'react', label: 'React', icon: Code2},
  {id: 'agent', label: 'AI agent', icon: Bot},
  {id: 'settings', label: 'Settings', icon: Settings2},
];

function CopyBlock({label, text, onNotice, primary = false, tall = false}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotice('Select the text and copy it with your keyboard.');
    }
  }
  return (
    <div className="st-codeblock">
      <div className="st-codeblock-head">
        <span>{label}</span>
        <button type="button" className={primary ? 'st-cta small' : 'st-pill'} onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className={tall ? 'is-tall' : ''}>
        <code>{text}</code>
      </pre>
    </div>
  );
}

/** "Use on your site": snippets, an AI-agent prompt and share links, all built from the current settings. */
export default function IntegratePanel({meta, def, config, onClose, onExport, onNotice}) {
  const [tab, setTab] = useState('web');
  const [bake, setBake] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); }
      if (e.key !== 'Tab') return;
      const items = [...dialogRef.current.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, []);

  const changed = useMemo(() => changedSettings(def, config), [def, config]);
  const encoded = bake ? encodeConfig(changed) : '';
  const background = transparent ? 'transparent' : '';
  const states = def.states?.options.map(o => o.id) || [];
  const expressions = def.expressions?.options.map(o => o.id) || [];
  const settings = Object.keys(def.defaults).filter(k => !(def.transient || []).includes(k));
  const shared = {id: meta.id, name: meta.name, encoded, background, states, expressions, settings};
  const changedCount = Object.keys(changed).length;

  return (
    <div className="st-dialog-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section ref={dialogRef} className="st-dialog st-glass" role="dialog" aria-modal="true" aria-labelledby="st-dialog-title">
        <header className="st-dialog-head">
          <div>
            <p className="st-kicker">Integrate</p>
            <h2 id="st-dialog-title">Use {meta.name} on your site</h2>
          </div>
          <button type="button" className="st-icon" aria-label="Close" ref={closeRef} onClick={onClose}>
            <X size={17} />
          </button>
        </header>


        <div className="st-dialog-options">
          <label className="st-toggle">
            <span>
              Include my settings <small>{changedCount ? `${changedCount} changed` : 'all defaults'}</small>
            </span>
            <input type="checkbox" role="switch" checked={bake} onChange={e => setBake(e.target.checked)} />
          </label>
          <label className="st-toggle">
            <span>Transparent background</span>
            <input type="checkbox" role="switch" checked={transparent} onChange={e => setTransparent(e.target.checked)} />
          </label>
        </div>

        <div className="st-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} id={`int-${t.id}`} aria-controls="st-int-panel" onClick={() => setTab(t.id)}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="st-dialog-body" id="st-int-panel" role="tabpanel" aria-labelledby={`int-${tab}`}>
          {tab === 'web' && (
            <>
              <p className="st-step">
                <b>1</b> Paste where the mascot should appear. It loads in its own frame, so it can't clash with your CSS.
              </p>
              <CopyBlock label="HTML" text={htmlSnippet(shared)} onNotice={onNotice} primary />
              <p className="st-step">
                <b>2</b> Drive it from your assistant's events.
              </p>
              <CopyBlock label="JavaScript" text={jsSnippet(shared)} onNotice={onNotice} />
            </>
          )}

          {tab === 'react' && (
            <>
              <p className="st-step">
                <b>1</b> Add this component, then render <code>{states.length ? '<MascottyMascot state={assistantState} />' : '<MascottyMascot expression={expression} />'}</code>.
              </p>
              <CopyBlock label="MascottyMascot.jsx" text={reactSnippet(shared)} onNotice={onNotice} primary tall />
            </>
          )}

          {tab === 'agent' && (
            <>
              <p className="st-step">
                <b>1</b> Paste this into Claude Code, Cursor or any coding agent working in your project. It explains where to embed{' '}
                {meta.name} and how to wire it to your assistant.
              </p>
              <CopyBlock label="Prompt" text={agentPrompt(shared)} onNotice={onNotice} primary tall />
            </>
          )}

          {tab === 'settings' && (
            <>
              <p className="st-step">Your changes save in this browser automatically. To keep or share them:</p>
              <CopyBlock label="Share link (opens the studio with these settings)" text={studioLink(meta.id, encodeConfig(changed))} onNotice={onNotice} primary />
              <CopyBlock label="Settings code (data-config)" text={encodeConfig(changed) || '(no changes from the defaults)'} onNotice={onNotice} />
              <div className="st-row">
                <button type="button" className="st-pill" onClick={onExport}>
                  <Download size={14} /> Download JSON
                </button>
                <a className="st-pill" href="#docs/quick-start">
                  <Link2 size={14} /> Developer documentation
                </a>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
