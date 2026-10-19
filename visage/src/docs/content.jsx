import {mascots} from '../mascots';
import {agentPrompt, firstEventSnippet, hostUrl, htmlSnippet, jsSnippet, reactSnippet} from '../integration';
import {repositoryUrl} from '../site';
import {docsHref} from './navigation';
import {CodeBlock, DocTable, Note} from './components';
import license from '../../../LICENSE?raw';
import packageInfo from '../../package.json';

const section = (id, title, body) => ({id, title, body});
const link = (id, label) => <a href={docsHref(id)}>{label}</a>;
const c = text => <code>{text}</code>;

export function getSections(page, selected) {
  const stateful = selected.states.length > 0;
  switch (page) {
    case 'quick-start': return [
      section('before-you-start', 'Before you start', <><p>Mascotty adds an expressive 3D character to your interface. Your application supplies the events; Mascotty supplies the face. You do not need an account, an assistant API key or an npm package to use the hosted embed.</p><ul><li>A recent browser with WebGL and hardware acceleration.</li><li>An HTTPS website for production. Detailed characters work best on a desktop GPU.</li><li>A container with an explicit width and height.</li></ul><p>Choose a character above, then follow the examples below. Prefer components? Start with the {link('react', 'React guide')}.</p></>),
      section('add-the-embed', 'Add the embed', <><p>Paste this HTML where you want {selected.name} to appear. The character fills the container and runs in its own iframe, keeping its styles separate from your page.</p><CodeBlock language="HTML">{htmlSnippet(selected)}</CodeBlock><Note title="Script order matters"><p>Load the script before calling {c('Mascotty')}. Do not add {c('defer')} to this example. If your application loads scripts asynchronously, wait for the script’s load event first.</p></Note></>),
      section('send-an-event', 'Send your first event', <><p>Run this JavaScript after the embed loader has loaded. In an HTML page, wrap it in a script tag. {stateful ? 'Use the character’s states to reflect what your assistant is doing.' : 'This character uses expressions and settings; it does not expose AI states.'} Commands issued before the iframe is ready are queued.</p><CodeBlock>{firstEventSnippet(selected)}</CodeBlock><p>You should see the character appear and respond to your settings. The {link('characters', 'character reference')} lists every supported state and expression.</p></>),
      section('check-readiness', 'Check readiness and errors', <><p>Subscribe before sending your application events. A ready event means the control API is available; graphics may still be loading. Keep a static fallback in your own interface if rendering fails.</p><CodeBlock>{`// Reuse the mascot instance from the previous example.
mascot.on('ready', info => {
  console.log('Available states:', info.states);
  console.log('Available expressions:', info.expressions);
});
mascot.on('error', message => {
  console.error('Mascotty:', message);
  // Show a static fallback or a retry action in your interface.
});`}</CodeBlock><p>Next, {link('configuration', 'customise the appearance')} or {link('assistant', 'connect your assistant')}.</p></>),
    ];
    case 'react': return [
      section('create-the-component', 'Create the component', <><p>Add this as {c('MascottyMascot.jsx')} in your application. It loads the hosted script, mounts {selected.name}, forwards current props and destroys its iframe on unmount. No additional package is required.</p><CodeBlock language="JSX" title="MascottyMascot.jsx">{reactSnippet(selected)}</CodeBlock><Note title="Use a client component"><p>This component needs browser APIs. In an application with server rendering, place it behind your framework’s client boundary. The script is loaded from an effect, after the host element exists.</p></Note></>),
      section('render-the-component', 'Render it in your app', <><CodeBlock language="JSX" title="App.jsx">{`import {MascottyMascot} from './MascottyMascot';

export default function App() {
  return (
    <MascottyMascot
      ${stateful ? 'state="idle"' : `expression="${selected.expressions[0]}"`}
      style={{width: 320, height: 400}}
      onError={message => console.error(message)}
    />
  );
}`}</CodeBlock><p>Replace the literal {c(stateful ? 'state' : 'expression')} with a value from your application. Select another character above to generate its component; to switch character types at runtime, mount the corresponding component in a separate branch or with a new React key.</p></>),
      section('component-props', 'Component props', <DocTable label="React component props" headers={['Prop', 'Type', 'Behavior']} rows={[
        [c('state'), 'string, optional', 'A supported AI state. Omit for characters without states.'],
        [c('expression'), 'string, optional', 'A supported expression preset. Omit for characters without expressions.'],
        [c('audioLevel'), 'number or null, optional', 'A level from 0 to 1; null returns to the character’s own audio animation.'],
        [c('style'), 'CSS style object, optional', 'Override the default 320 × 400 container. Keep both dimensions non-zero.'],
        [c('onError'), 'function, optional', 'Receives loader errors and embed error messages. Defaults to console.error.'],
      ]} />),
      section('react-lifecycle', 'Loading and cleanup', <><p>Multiple instances of this component share its pending script request. If props change while the script loads, the latest values are applied when the mascot mounts. Failed script requests are reported through {c('onError')} and can be retried by remounting the component.</p><p>The cleanup handles remounts, including development checks that mount and unmount effects more than once. Keep the generated component definition outside your parent’s render function, and keep its host element mounted while it is in use.</p></>),
    ];
    case 'configuration': return [
      section('customise-in-studio', 'Customise in the studio', <><p>Open <a href={`#studio/${selected.id}`}>{selected.name}’s studio</a>, tune the appearance and select <strong>Use on your site</strong>. Enable <strong>Include my settings</strong> to bake your changes into the HTML or React example. Enable <strong>Transparent background</strong> to blend it into your interface.</p><p>The studio saves settings in that browser. To share them with someone else, use the Settings tab’s share link, settings code or JSON export. Your browser’s saved settings are not sent to an embedded instance automatically.</p></>),
      section('html-attributes', 'HTML attributes', <DocTable label="HTML embed attributes" headers={['Attribute', 'Required / default', 'Purpose']} rows={[
        [c('data-mascotty'), 'Required', 'Character id from the character reference.'],
        [c('data-config'), 'Optional; defaults', 'Base64url settings code copied from the studio.'],
        [c('data-background'), 'Optional; character surface', 'Set to transparent for a transparent iframe background.'],
        [c('data-follow-page'), 'Optional; true', 'Set to false to stop forwarding the outer page’s pointer. The character can still follow a pointer inside its own frame.'],
        [c('data-title'), 'Optional; Animated mascot', 'An accessible name for the iframe. Describe its purpose in your interface.'],
      ]} />),
      section('mount-options', 'Mount from JavaScript', <><p>Use this after the loader has finished and your host element exists. Keep the returned instance so that each character can be controlled independently.</p><CodeBlock>{`const host = document.querySelector('#mascot');
const mascot = Mascotty.mount(host, {
  mascot: '${selected.id}',
  background: 'transparent',
  followPage: false,
  title: '${selected.name}, assistant status',
});

// When your view is removed:
mascot.destroy();`}</CodeBlock><DocTable label="JavaScript mount options" headers={['Option', 'Type / default', 'Purpose']} rows={[
        [c('mascot'), 'string; required', 'A character id.'], [c('config'), 'string; optional', 'The studio’s encoded settings code.'], [c('background'), 'string; optional', 'Use transparent to remove the frame’s studio backdrop.'], [c('followPage'), 'boolean; true', 'Forward pointer movement outside the iframe.'], [c('title'), 'string; Animated mascot', 'Accessible iframe title.'],
      ]} /><Note title="Give the host an actual size"><p>For example: {c('<div id="mascot" style="width: 320px; height: 400px"></div>')}. A percentage height only works if its containing element also has a defined height.</p></Note></>),
      section('live-settings', 'Change and reset settings', <><CodeBlock>{`mascot.set({follow: false, motion: false});
mascot.reset();`}</CodeBlock><p>{c('set')} accepts known settings of the right type. Numeric controls are clamped to their supported ranges; invalid colors and unsupported state or expression IDs are ignored. Discover valid setting keys from the ready event’s {c('info.settings')} array. Settings changed in this way stay in that instance.</p><p>{c('reset()')} returns to the embed’s starting settings, including its supplied settings code. It also clears the externally supplied audio level.</p></>),
    ];
    case 'api': return [
      section('global-api', 'Global API', <><p>The loader exposes {c('window.Mascotty')}. Its API version is {c('Mascotty.version')} ({c('"1"')}); the source package is version {packageInfo.version}. Include the script from the quick start before using these methods.</p><DocTable label="Global Mascotty API" headers={['Method', 'Returns', 'Behavior']} rows={[
        [c('Mascotty.mount(element, options)'), 'Mascot instance', 'Mount into an element or selector. Replaces an existing instance on that host. Throws if the element or required mascot option is missing.'],
        [c('Mascotty.get(id)'), 'Instance or null', 'Find the first matching character id; scans declarative containers if needed.'],
        [c('Mascotty.get(element)'), 'Instance or null', 'Find the instance on this exact host element. Preferred when a character is used more than once.'],
        [c('Mascotty.scan(root?)'), 'undefined', 'Mount uninitialised data-mascotty containers under the supplied root, or under document. Useful after dynamically inserting HTML.'],
      ]} /><p>{c('Mascotty.host')} contains the loader’s host URL. Keep your own instance references for deterministic control of multiple mascots.</p></>),
      section('instance-methods', 'Instance methods', <><DocTable label="Mascot instance methods" headers={['Method', 'Arguments', 'Behavior']} rows={[
        [c('setState(name)'), 'Supported state id', 'Change the assistant lifecycle state.'],
        [c('setExpression(name, intensity?)'), 'Expression id; optional intensity', 'Apply a preset. Intensity is clamped from 0 to 1.5 when supported by the character.'],
        [c('setAudioLevel(level)'), '0–1, or null', 'Set externally supplied audio energy, or clear it.'],
        [c('set(values)'), 'Object of settings', 'Apply known, typed settings.'],
        [c('reset()'), 'None', 'Restore the initial embed settings and reset audio.'],
        [c('on(event, callback)'), 'ready or error; function', 'Subscribe to an event. A ready subscriber is called immediately if readiness was already received.'],
        [c('call(name, ...args)'), 'Supported extra method', 'Call a character-specific control listed in info.methods.'],
        [c('destroy()'), 'None', 'Remove the frame, event listeners and host reference. Safe to call more than once.'],
      ]} /><p>Setters, {c('reset')}, {c('on')} and {c('call')} return the instance for chaining; {c('destroy')} returns no value. Commands queue until readiness. Unknown state, expression or extra-method commands emit an error asynchronously rather than throwing on your page. Commands on destroyed instances are ignored.</p></>),
      section('events', 'Events and readiness', <><CodeBlock>{`mascot.on('ready', info => {
  console.log(info.mascot, info.name);
  console.log(info.states, info.expressions);
  console.log(info.settings, info.methods);
});

mascot.on('error', message => {
  console.error(message);
});`}</CodeBlock><p>The ready payload includes {c('mascot')} (id), {c('name')}, {c('states')}, {c('expressions')}, {c('settings')} and {c('methods')}. Empty arrays mean the character does not offer that capability. Graphics or asset failures, invalid character IDs and failed commands are reported through error callbacks.</p><p>There is no unsubscribe method in version 1. Keep subscriptions tied to an instance and call {c('destroy()')} when its host view is removed.</p></>),
      section('extra-controls', 'Character-specific controls', <><p>The first character with a console API is {mascots.find(item => item.api)?.name}. Its embed exposes the following controls. Read {c('info.methods')} before invoking an extra on a different character.</p><CodeBlock>{`mascot.call('setPose', 'wave');
mascot.call('setViseme', 'O');
mascot.call('setGaze', 0.3, 0.2);`}</CodeBlock><p>These examples are for a character that supports those methods. The console controller displayed inside a studio is specific to that studio; websites should use {c('Mascotty')} and the embed methods above.</p></>),
      section('compatibility', 'Compatibility', <><p>{c('window.Visage')}, {c('visage.js')} and {c('data-visage')} remain aliases for existing integrations. Use the Mascotty names for new work. The iframe protocol retains the {c('visage: 1')} message marker.</p><p>Messages from the loader’s frame are checked against the expected source window and origin. Use the public API instead of writing your own frame messages; character options and method availability can vary.</p></>),
    ];
    case 'characters': return [
      section('choose-a-character', 'Choose a character', <><p>This reference reads the same registry as the landing page and studios. Capabilities differ: do not send a state or expression that the selected character does not expose.</p><DocTable label="Character capabilities" headers={['Character', 'Embed id', 'AI states', 'Expressions']} rows={mascots.map(item => [<a href={`#studio/${item.id}`}>{item.name}</a>, c(item.id), item.states.length || 'None', item.expressions.length || 'None'])} /></>),
      ...mascots.map(item => section(item.id, item.name, <><div className="docs-character"><img src={`${import.meta.env.BASE_URL}images/${item.image}`} alt={item.imageAlt} width="112" height="112" loading="lazy" /><div><p>{item.tagline}</p><a href={`#studio/${item.id}`}>Open {item.name} studio →</a></div></div><h3>States</h3><p>{item.states.length ? item.states.map((value, index) => <span key={value}>{index > 0 && ', '}{c(value)}</span>) : 'No AI states. Use expressions and settings instead.'}</p><h3>Expressions</h3><p>{item.expressions.length ? item.expressions.map((value, index) => <span key={value}>{index > 0 && ', '}{c(value)}</span>) : 'No expression presets. Use states and appearance settings instead.'}</p><CodeBlock>{jsSnippet(item)}</CodeBlock></>)),
    ];
    case 'assistant': return [
      section('use-app-events', 'Use your application events', <><p>Mascotty does not run a language model or receive your prompts. Connect it to the lifecycle of the assistant you already have. Keep your model credentials on your own server.</p>{stateful ? <DocTable label="Assistant event mapping" headers={['Your application', 'Mascot state']} rows={[
        ['The user is typing or recording', c('listening')], ['A request was sent; waiting for output', c('thinking')], ['The answer is streaming or being read', c('speaking')], ['The interaction has finished', c('idle')],
      ].filter(([, value]) => selected.states.includes(value.props.children))} /> : <Note title="This character uses expressions"><p>{selected.name} has no AI states. Map your application’s events to its expressions, or choose a character with states above.</p></Note>}<CodeBlock>{jsSnippet(selected)}</CodeBlock><p>Put calls in your existing request, stream and completion handlers. Avoid polling. If a request fails, return to idle, or use an error state when that character provides one.</p></>),
      section('audio-and-privacy', 'Audio and lip sync', <><p>Feed {c('setAudioLevel')} a level from 0 to 1 while your text-to-speech audio plays. Reset it to null when playback ends. Pass the same value through the React component’s {c('audioLevel')} prop if you use React.</p><CodeBlock>{`// In your audio analysis callback:
mascot.setAudioLevel(Math.max(0, Math.min(1, measuredLevel)));

// When playback ends:
mascot.setAudioLevel(null);`}</CodeBlock><p>Measure energy from your own audio pipeline, for example with an AnalyserNode. Mascotty receives only the number you send, not your audio stream. The studio’s microphone preview measures levels in the browser and does not upload them. Browser speech playback may use your browser’s voice service.</p></>),
      section('coding-agent', 'Use your coding agent', <><p>Copy this prompt into the coding agent working in your app. For customised appearance, use the studio’s AI agent tab so the prompt includes your settings.</p><CodeBlock language="Agent prompt">{agentPrompt(selected)}</CodeBlock></>),
    ];
    case 'deployment': return [
      section('build-and-publish', 'Build and publish', <><p>To host your own Mascotty studio and embeds, clone the repository and use Node.js 22 or later. The app is a static React and Three.js build; there is no server database or authentication service to configure.</p><CodeBlock language="Shell">{`git clone ${repositoryUrl}.git
cd cute-orb/visage
npm ci
npm test
npm run build
npm run preview`}</CodeBlock><p>Publish the complete {c('dist/')} directory over HTTPS, including both embed loaders, character media, fonts and assets. The landing page and every documentation guide are pre-rendered as HTML. Serve directory index files for documentation URLs. Studio and embed routes use URL hashes and need no server rewrites. The repository’s GitHub Pages workflow already builds, tests and publishes this directory after eligible pushes to main.</p></>),
      section('configure-the-host', 'Configure the embed host', <><p>On a deployed site, copied snippets use that site’s origin and asset base path. During development they use the project’s published address. Set this build-time variable to use another HTTPS host:</p><CodeBlock language="Shell">{'VITE_PUBLIC_SITE_URL=https://mascots.example.com npm run build'}</CodeBlock><p>The value must contain an HTTPS origin and optional path, without credentials, query strings or fragments. This variable is public build configuration; do not put secrets in it.</p></>),
      section('base-path', 'Host in a subdirectory', <><CodeBlock language="Shell">{'VISAGE_BASE=/characters/ VITE_PUBLIC_SITE_URL=https://example.com/characters npm run build'}</CodeBlock><p>{c('VISAGE_BASE')} controls asset URLs and retains its original name for compatibility with the existing deployment workflow. Keep the trailing slash in the asset base. Include the same subdirectory in the public host override, if you set one.</p><p>Check the deployed {c('mascotty.js')}, character assets and {c('docs/quick-start/')} route before sharing integration code.</p></>),
      section('content-security-policy', 'Content Security Policy', <><p>If the consuming website has a Content Security Policy, allow the Mascotty host in {c('script-src')} and {c('frame-src')}. For this build, the host origin is {c(new URL(hostUrl()).origin)}. Keep your other policy directives and trusted sources in place.</p><p>The frame’s own host must permit the scripts, styles, fonts, images and media used by its build. Test the full policy on your deployment; console errors identify blocked resource types. Environments that disallow iframes, external scripts or WebGL may require a static character image instead.</p></>),
      section('release-checklist', 'Release checklist', <ul><li>Run {c('npm test')} and {c('npm run build')}.</li><li>Open each studio, a documentation deep link and an embed from a different origin.</li><li>Check both narrow and wide layouts, keyboard focus and reduced motion.</li><li>Send a state, expression and audio level supported by your chosen character.</li><li>Verify loading errors reach your fallback UI and that unmounting removes the iframe.</li><li>Publish all assets together, then copy snippets from the deployed studio.</li><li>Keep the MIT license and the bundled third-party notices with your distribution.</li></ul>),
    ];
    case 'troubleshooting': return [
      section('blank-character', 'The character is blank', <ul><li>Confirm the host element has a non-zero width and height.</li><li>Enable hardware acceleration and check that your browser supports WebGL.</li><li>Look for blocked frame, script, image or model requests in the browser console and Network panel.</li><li>Publish the full build directory, with the correct base path.</li><li>Subscribe to {c("mascot.on('error', callback)")} and display a fallback if graphics cannot initialise.</li></ul>),
      section('missing-global', 'Mascotty is not defined', <><p>Your code ran before the loader finished. Put a normal script tag before the code that accesses Mascotty, wait for its load event, or use the {link('react', 'React component')}. Confirm the script request returns JavaScript rather than an HTML error page.</p><p>A missing instance from {c('get')} means there is no matching mounted container yet. Render that element first and then call {c('Mascotty.mount')} or {c('Mascotty.scan')}.</p></>),
      section('unsupported-commands', 'A state or expression has no effect', <><p>Inspect {c('info.states')} and {c('info.expressions')} from the ready event, or check the {link('characters', 'character reference')}. A character without states cannot respond to state commands. Invalid commands emit error messages; malformed settings are ignored or clamped.</p><p>When using a fixed mouth shape, it can override audio mouth movement. Return that setting to auto in the studio if you want lip sync.</p></>),
      section('multiple-instances', 'Multiple or stale instances', <><p>Keep each {c('mount')} result, or use {c('Mascotty.get(element)')}. An id lookup returns the first matching character. Call {c('destroy()')} when your view unmounts. The generated React component performs this cleanup for you and applies the latest props after script loading.</p><p>If the script request fails, fix the connection or policy issue and remount the React component. Do not repeatedly add new script tags or poll for the global.</p></>),
      section('accessibility', 'Accessibility and motion', <><p>Give the iframe a useful {c('data-title')} or mount {c('title')}. Keep the assistant’s actual status and reply in readable HTML; a visual expression must not be the only way to understand a message or an error.</p><p>The studio uses reduced-motion preferences when initialising animation defaults. Your application can also send {c('mascot.set({motion: false, follow: false})')}. Make sure decorative movement does not prevent someone from using the surrounding interface.</p></>),
      section('microphone-and-speech', 'Microphone or speech is unavailable', <><p>The microphone preview requires a secure context and browser permission. Check your browser’s permissions and selected input device. A denied request does not prevent embedding or manual audio-level control.</p><p>Speech synthesis depends on the browser and its available voices. Use your own text-to-speech service and send its audio energy to Mascotty if browser playback is unsuitable.</p></>),
      section('report-a-problem', 'Report a reproducible problem', <><p><a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer">Open a GitHub issue</a> with the browser and OS, character id, relevant settings, expected result, reproduction steps and console or network errors. Include a minimal embed or screenshot when useful. Remove credentials and private messages before sharing logs.</p></>),
    ];
    case 'contributing': return [
      section('welcome', 'Build with the community', <><p>Mascotty is an MIT-licensed open-source project for developers, designers and character makers. Contributions to expressions, integrations, documentation, accessibility and rendering are welcome.</p><p>Discuss substantial changes in a <a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer">GitHub issue</a> first. Keep conversations considerate and make room for people learning the project.</p></>),
      section('development-setup', 'Set up the project', <><p>Fork the repository, clone your fork and use Node.js 22 or later with npm. The example below clones the upstream source; substitute your fork’s URL if you plan to submit a pull request.</p><CodeBlock language="Shell">{`git clone ${repositoryUrl}.git
cd cute-orb/visage
npm ci
npm run dev`}</CodeBlock><p>The development server prints its preview address. You do not need an assistant account or API key. See the {link('deployment', 'deployment guide')} if you need your copied examples to use your own published host.</p></>),
      section('project-structure', 'Project structure', <DocTable label="Source architecture" headers={['Path in visage/', 'Responsibility']} rows={[
        [c('src/mascots/'), 'Shared character registry and lazy-loaded studio definitions.'], [c('src/studio/'), 'Shared studio, schema-driven controls, configuration, voice preview and integration panel.'], [c('src/integration.js'), 'One source for settings codes, links and generated HTML, JavaScript, React and agent examples.'], [c('src/embed/'), 'Frameless character route and message handling.'], [c('src/docs/'), 'Documentation navigation, written guides and reusable examples.'], [c('public/mascotty.js'), 'Loader that third-party websites include.'], [c('public/visage.js'), 'Compatibility loader; keep its behavior aligned with the new loader.'], [c('tests/'), 'Integration regression tests and a real iframe smoke-test fixture.'],
      ]} />),
      section('contribute-a-character', 'Add or improve a character', <ol><li>Add original artwork and a renderer that follows the existing character contract.</li><li>Create a definition in {c('src/mascots/')} containing defaults, controls, supported states or expressions and the renderer.</li><li>Register the character in {c('src/mascots/index.js')}. Keep names, ids and capability lists in this registry; pages and docs read it.</li><li>Mount the renderer in a {c('.presence')} container. Resize with its host, handle rendering errors, and dispose resources and listeners on unmount.</li><li>Respect reduced motion. Keep camera framing and animation inside the stage.</li><li>Test the studio and the website embed, including queued commands, invalid settings and destroy/remount.</li><li>Follow the detailed mascot rulebook included in the source repository before changing renderer behavior.</li></ol>),
      section('checks-and-pull-requests', 'Checks and pull requests', <><CodeBlock language="Shell">{'npm test\nnpm run build'}</CodeBlock><p>Keep each pull request focused. Describe the problem, resulting behavior and verification. Add screenshots for visual changes and regression tests for integration behavior. Check a narrow screen, keyboard navigation, reduced motion and graphics fallback.</p><p>Generate examples through {c('src/integration.js')} so the studio, documentation and coding-agent prompt stay consistent. Do not commit credentials, dependency directories, build output or private data.</p></>),
      section('contribution-rights', 'Contribution rights and attribution', <><p>Contribute only work you have permission to share under the project’s MIT license. Include the original notices for third-party work. Reference artwork and dependencies retain their original rights; the project license does not relicense them.</p><p>Read {link('license', 'the license and credits')} before redistributing the project or its assets.</p></>),
    ];
    case 'license': return [
      section('mit-license', 'MIT license', <><p>You may use, modify and distribute original Mascotty project material, including in commercial projects, under the following terms. Retain the copyright and license notice.</p><pre className="docs-license" tabIndex={0}>{license}</pre></>),
      section('third-party', 'Third-party material', <><p>Dependencies, fonts, reference images and artwork supplied by third parties retain their own licenses. The MIT license applies to original project material and does not grant rights to third-party references.</p><ul><li>The footer’s Helvetiker typeface is distributed with its <a href={`${import.meta.env.BASE_URL}fonts/helvetiker-license.txt`}>original font license notice</a>.</li><li>React, Three.js, font packages and other dependencies carry their own notices in their packages.</li><li>Reference artwork in the source repository is not automatically covered by the project’s MIT license. Check its provenance before reuse.</li></ul><p>The plain-text <a href={`${import.meta.env.BASE_URL}license.txt`}>MIT license</a> remains available for redistribution tooling.</p></>),
      section('community-ownership', 'Help keep the project useful', <><p>The source and issue tracker are available on <a href={repositoryUrl} target="_blank" rel="noreferrer">GitHub</a>. Fix unclear instructions, improve an example or share a reproducible bug. The {link('contributing', 'contributor guide')} explains how to start.</p></>),
    ];
    default: return [];
  }
}
