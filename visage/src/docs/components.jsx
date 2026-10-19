import {useEffect, useRef, useState} from 'react';
import {Check, Copy} from 'lucide-react';

export function CodeBlock({children, language = 'JavaScript', title}) {
  const [status, setStatus] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { clearTimeout(timer.current); setStatus(''); }, [children]);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(children);
      setStatus('Copied');
    } catch {
      setStatus('Select the code and copy it with your keyboard.');
    }
    timer.current = setTimeout(() => setStatus(''), 3000);
  }
  return <figure className="docs-code">
    <figcaption><span>{title || language}</span><button type="button" onClick={copy} aria-label={`Copy ${title || language} example`}>
      {status === 'Copied' ? <Check size={15} /> : <Copy size={15} />}{status === 'Copied' ? 'Copied' : 'Copy'}
    </button></figcaption>
    <pre tabIndex={0} aria-label={`${title || language} code example`}><code>{children}</code></pre>
    <span className="docs-copy-status" role="status">{status}</span>
  </figure>;
}

export function DocTable({headers, rows, label}) {
  return <div className="docs-table-scroll" tabIndex={0} role="region" aria-label={label}>
    <table><caption className="sr-only">{label}</caption><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export function Note({title, children}) {
  return <aside className="docs-note"><strong>{title}</strong><div>{children}</div></aside>;
}
