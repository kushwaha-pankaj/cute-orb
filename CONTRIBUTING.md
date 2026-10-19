# Contributing to Mascotty

Mascotty is an open-source project for the community. Contributions to code, character expressions, documentation, accessibility and developer examples are welcome.

Source: https://github.com/kushwaha-pankaj/cute-orb
Issues and ideas: https://github.com/kushwaha-pankaj/cute-orb/issues
License: MIT (see LICENSE in this repository).

The published contributor guide is available at https://kushwaha-pankaj.github.io/cute-orb/#docs/contributing.

## Start developing

Use Node.js 22 or later and npm. Fork the repository, clone your fork, then run:

```sh
cd cute-orb/visage
npm ci
npm run dev
```

The development server prints its preview address. The studio's copied snippets use the published Mascotty address, so they stay portable. To point integrations at your own HTTPS deployment, set VITE_PUBLIC_SITE_URL before building (see the Deployment guide in the website documentation).

## Before a pull request

```sh
npm test
npm run build
```

Keep a change focused. Describe the problem, the new behavior and how you verified it. Add screenshots for visual changes and a regression test for integration behavior. Check keyboard navigation, a narrow phone screen, reduced motion and the fallback without WebGL.

Never commit credentials, API keys, dependency directories or build output. No account or assistant API key is needed to run Mascotty.

## Add or improve a character

Read visage/MASCOT_RULEBOOK.md in the repository before editing a character. Add its metadata in src/mascots/index.js, its definition in src/mascots/, and its renderer and original artwork. UI pages read the registry; don't duplicate mascot names or counts in them. Every character must work in its studio and through the embed loader.

Generate integration examples through src/integration.js. Keep mascotty.js and the compatibility loader visage.js behavior in sync, including legacy embeds. Preserve caller settings, clean up renderers and event listeners, and test remounting.

## Share an idea or report a bug

Open a GitHub issue with the browser and OS, which character or page you used, steps to reproduce and the expected result. Include a screenshot or minimal integration example when useful. For feature ideas, describe the problem the feature would solve.

## Licensing and credits

Original project code is MIT licensed. Contribute only work you have permission to share under that license, and include attribution and licensing for third-party material. Reference images in inspiration/ and third-party dependencies, fonts and artwork retain their own rights; the project license does not relicense them. The footer's Helvetiker font notice is included in fonts/helvetiker-license.txt.

Be considerate, discuss substantial changes in an issue first, and make room for people learning their way around the project.
