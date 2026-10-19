import {hydrateRoot, createRoot} from 'react-dom/client';
import {App, AppBoundary} from './App';

// Preserve bookmarked hash documentation links while giving each guide a crawlable URL.
const legacy = location.hash.match(/^#docs\/([a-z-]+)(?:\?section=([^&]+))?$/);
if (legacy) location.replace(`${import.meta.env.BASE_URL}docs/${legacy[1]}/${legacy[2] ? `#docs-${legacy[2]}` : ''}`);
else {
  const root = document.getElementById('root');
  const app = <AppBoundary><App /></AppBoundary>;
  // Hash studio/embed routes intentionally start from the client, not the landing markup.
  if (root.hasChildNodes() && !/^#(?:studio|embed|portrait|home)(?:\/|$)/.test(location.hash)) hydrateRoot(root, app);
  else {
    root.replaceChildren();
    delete document.documentElement.dataset.clientRoute;
    createRoot(root).render(app);
  }
}
