# Rolodex Capture Launcher (Manifest V3)

This directory houses the lightweight Manifest V3 Chrome extension that hands off rich capture flows to the Rolodex web app. The service worker collects page context, opens the `/capture` workspace with encoded query params, and shares capture/auth status with the popup UI—no Supabase tokens or API calls live in the extension.

## Key capabilities

- Detects development/staging/production environments automatically while allowing an override from the popup.
- Registers both a context-menu action on images and the toolbar button to open `/capture` with image URL, source URL, title, and timestamp metadata.
- Stores the last capture outcome in `chrome.storage.local` and surfaces it in the popup alongside any errors.
- Polls the web app's `/auth/extension/status` endpoint (with graceful fallbacks) so the popup can indicate whether the user is signed in.
- Ships a designer-grade popup with localisation scaffolding, focus management, and quick links to capture, library, and sign-in flows.

## Getting started

1. `cd extension`
2. Install tooling: `npm install`
3. Run unit tests: `npm test`
4. Lint the manifest/assets: `npm run lint`
5. Package the extension: `npm run package` (outputs to `dist/`)
6. Load the directory as an unpacked extension in Chrome.

## Development notes

- The background service worker (`background.js`) is an ES module. Chrome's MV3 runtime loads it directly—no bundler required.
- Helper utilities live under `lib/` with accompanying `vitest` suites in `tests/`.
- Status broadcasts flow through `chrome.runtime.sendMessage`. The popup listens for `rolodex:statusUpdated` to update UI without reopening.
- Host permissions are limited to the Rolodex app domains because all heavy lifting happens server-side.

## Packaging automation

`npm run package` zips the extension (excluding `dist/` and `node_modules/`) so it can be uploaded to the Chrome Web Store. Update `manifest.json`'s `version` and `version_name` before shipping.
