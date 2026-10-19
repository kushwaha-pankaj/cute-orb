import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Github, Search, X} from 'lucide-react';
import {featured, mascots} from '../mascots';
import {repositoryUrl} from '../site';
import {docsHref, docsPages, docsText, getDocsPage, searchDocs} from './navigation';
import {getSections} from './content';
import './Docs.css';

export default function DocsPage({pageId, sectionId}) {
  const page = getDocsPage(pageId);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [mascotId, setMascotId] = useState(featured.id);
  const heading = useRef(null);
  const previousPage = useRef(pageId);
  const selected = mascots.find(mascot => mascot.id === mascotId) || featured;
  const sections = useMemo(() => page ? getSections(page.id, selected) : [], [page, selected]);
  const searchIndex = useMemo(() => Object.fromEntries(docsPages.map(item => [item.id,
    getSections(item.id, selected).map(section => `${section.title} ${docsText(section.body)}`).join(' '),
  ])), [selected]);
  const results = searchDocs(query, searchIndex);
  const groups = [...new Set(docsPages.map(item => item.group))];
  const index = docsPages.indexOf(page);

  useEffect(() => {
    document.title = `${page?.title || 'Page not found'} — Mascotty docs`;
    setMenu(false);
    const changed = previousPage.current !== pageId;
    previousPage.current = pageId;
    const frame = requestAnimationFrame(() => {
      const target = sectionId && document.getElementById(`docs-${sectionId}`);
      if (target) { target.scrollIntoView({block: 'start'}); target.focus({preventScroll: true}); }
      else { window.scrollTo(0, 0); if (changed) heading.current?.focus({preventScroll: true}); }
    });
    return () => cancelAnimationFrame(frame);
  }, [pageId, page, sectionId]);

  return <div className="docs">
    <a className="docs-skip" href="#docs-main" onClick={event => { event.preventDefault(); document.getElementById('docs-main')?.focus(); }}>Skip to documentation</a>
    <header className="docs-header">
      <a className="docs-brand" href={import.meta.env.BASE_URL} aria-label="Mascotty home"><img src={`${import.meta.env.BASE_URL}images/mascotty-logo.webp`} alt="" width="34" height="34" /><span>Mascotty</span></a>
      <a className="docs-header-title" href={docsHref()}>Documentation</a>
      <nav aria-label="Documentation resources"><a href={`${import.meta.env.BASE_URL}#studio/${selected.id}`}>Open studio <ArrowUpRight size={15} /></a><a href={repositoryUrl} target="_blank" rel="noreferrer" aria-label="Mascotty on GitHub"><Github size={20} /></a></nav>
      <button className="docs-menu" type="button" aria-expanded={menu} aria-controls="docs-navigation" onClick={() => setMenu(!menu)}>{menu ? 'Close guides' : 'Browse guides'}</button>
    </header>
    <div className="docs-layout">
      <aside className={`docs-sidebar${menu ? ' is-open' : ''}`} id="docs-navigation">
        <form className="docs-search" role="search" onSubmit={event => event.preventDefault()}>
          <Search size={17} aria-hidden="true" /><label className="sr-only" htmlFor="docs-search">Search documentation</label>
          <input id="docs-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search guides…" type="search" />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}
        </form>
        <nav aria-label="Developer documentation">
          {groups.map(group => {
            const pages = results.filter(item => item.group === group);
            return pages.length ? <div className="docs-nav-group" key={group}><h2>{group}</h2>{pages.map(item => <a key={item.id} href={docsHref(item.id)} aria-current={page?.id === item.id ? 'page' : undefined} onClick={() => { setMenu(false); setQuery(''); }}>{item.title}</a>)}</div> : null;
          })}
          {query && <p className="docs-search-status" role="status">{results.length ? `${results.length} matching guide${results.length === 1 ? '' : 's'}` : 'No matching guides. Try “React”, “audio” or “deploy”.'}</p>}
        </nav>
        <a className="docs-back" href={import.meta.env.BASE_URL}><ArrowLeft size={15} /> Back to Mascotty</a>
      </aside>
      <main className="docs-main" id="docs-main" tabIndex={-1}>
        {page ? <>
          <div className="docs-breadcrumb"><a href={docsHref()}>Docs</a><span>/</span><span>{page.group}</span></div>
          <header className="docs-page-heading"><h1 ref={heading} tabIndex={-1}>{page.title}</h1><p>{page.description}</p></header>
          {['quick-start', 'react', 'configuration', 'assistant'].includes(page.id) && <div className="docs-character-select"><label htmlFor="docs-character">Examples for</label><select id="docs-character" value={mascotId} onChange={event => setMascotId(event.target.value)}>{mascots.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><a href={`${import.meta.env.BASE_URL}#studio/${selected.id}`}>Customise in studio <ArrowUpRight size={14} /></a></div>}
          <nav className="docs-mobile-toc" aria-label="On this page"><details><summary>On this page</summary>{sections.map(section => <a key={section.id} href={docsHref(page.id, section.id)}>{section.title}</a>)}</details></nav>
          <article>{sections.map(section => <section className="docs-section" key={section.id} id={`docs-${section.id}`} tabIndex={-1} aria-labelledby={`docs-title-${section.id}`}><h2 id={`docs-title-${section.id}`}><a href={docsHref(page.id, section.id)}>{section.title}<span aria-hidden="true"> #</span></a></h2>{section.body}</section>)}</article>
          <div className="docs-page-bottom"><p>Found something unclear? <a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer">Suggest an improvement <ArrowUpRight size={14} /></a></p><nav aria-label="Next and previous guide">{index > 0 && <a href={docsHref(docsPages[index - 1].id)}><ArrowLeft size={17} /><span><small>Previous</small>{docsPages[index - 1].title}</span></a>}{index < docsPages.length - 1 && <a href={docsHref(docsPages[index + 1].id)}><span><small>Next guide</small>{docsPages[index + 1].title}</span><ArrowRight size={17} /></a>}</nav></div>
        </> : <><header className="docs-page-heading"><h1 ref={heading} tabIndex={-1}>Guide not found</h1><p>Choose a guide from the navigation or start with your first embed.</p></header><a className="docs-button" href={docsHref()}>Go to quick start <ArrowRight size={17} /></a></>}
        <footer className="docs-footer"><span>Mascotty · Built for the community</span><a href={docsHref('license')}>MIT licensed</a></footer>
      </main>
      {page && <aside className="docs-toc"><nav aria-label="On this page"><h2>On this page</h2>{sections.map(section => <a key={section.id} href={docsHref(page.id, section.id)}>{section.title}</a>)}</nav><a href={docsHref('contributing')}>Help improve Mascotty <ArrowUpRight size={15} /></a></aside>}
    </div>
  </div>;
}
