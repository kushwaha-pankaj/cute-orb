export const docsPages = [
  {id: 'quick-start', group: 'Start here', title: 'Quick start', description: 'Put a character on your website and send its first event.', keywords: 'html embed script div getting started requirements'},
  {id: 'react', group: 'Start here', title: 'React integration', description: 'A component that follows your app state and cleans up on unmount.', keywords: 'props jsx component lifecycle ssr errors'},
  {id: 'configuration', group: 'Build with Mascotty', title: 'Configuration', description: 'Choose a character, save its appearance and share your settings.', keywords: 'attributes options mount transparent settings config share'},
  {id: 'api', group: 'Build with Mascotty', title: 'API reference', description: 'Methods, events, return values and character-specific controls.', keywords: 'get mount setState setExpression setAudioLevel reset destroy ready error call'},
  {id: 'characters', group: 'Build with Mascotty', title: 'Character reference', description: 'Find the states and expressions available for each character.', keywords: 'mallow blob portrait moods states poses capabilities'},
  {id: 'assistant', group: 'Build with Mascotty', title: 'Connect an assistant', description: 'Map chat, generation and audio events to your mascot.', keywords: 'ai agent prompt listening thinking speaking audio tts'},
  {id: 'deployment', group: 'Ship your project', title: 'Deployment', description: 'Build, host and configure Mascotty for your own domain.', keywords: 'hosting https base path static csp production environment github pages'},
  {id: 'troubleshooting', group: 'Ship your project', title: 'Troubleshooting', description: 'Resolve loading, rendering, event and integration problems.', keywords: 'blank webgl errors duplicate strict mode microphone speech privacy accessibility'},
  {id: 'contributing', group: 'Open source', title: 'Contributing', description: 'Set up the project, run checks and contribute code or characters.', keywords: 'community fork pull request development install architecture tests node npm'},
  {id: 'license', group: 'Open source', title: 'License & credits', description: 'MIT terms, third-party notices and community ownership.', keywords: 'copyright attribution permissions commercial fonts assets'},
];

export const docsHref = (page = 'quick-start', section) => `${import.meta.env?.BASE_URL || '/'}docs/${page}/${section ? `#docs-${encodeURIComponent(section)}` : ''}`;
export const getDocsPage = id => docsPages.find(page => page.id === (id || 'quick-start'));
// Index authored content and code without rendering HTML or adding a search service.
export const docsText = node => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(docsText).join(' ');
  if (!node?.props) return '';
  return [node.props.children, node.props.rows, node.props.headers, node.props.title].map(docsText).join(' ');
};

export const searchDocs = (query, content = {}) => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return docsPages.filter(page => words.every(word => `${page.title} ${page.description} ${page.keywords} ${content[page.id] || ''}`.toLowerCase().includes(word)));
};
