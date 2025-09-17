# Rolodex Capture Launcher (Manifest V3)

This directory contains the lightweight Manifest V3 Chrome extension that launches the Rolodex capture workspace. The service worker only handles the context menu and deep-link generation while the full capture flow continues inside the web app.

## Key capabilities

- Detects development/staging/production environments automatically (overrideable in the popup).
- Adds a contextual "Capture in Rolodex" action for images.
- Requests a short-lived capture URL from the API and opens `/capture` with signed JWT metadata.
- Stores developer Supabase tokens in encrypted `chrome.storage.sync` rather than hard-coding them.
- Provides a popup to manage tokens, overrides, and quick links to the capture workspace.

## Getting started

1. `cd extension`
2. Install tooling once: `npm install`
3. Run lint checks: `npm run lint`
4. Package the extension: `npm run package` (outputs to `dist/`)
5. Load the directory as an unpacked extension in Chrome.

While developing, keep the popup open to paste a Supabase session token (copy from the web app via `supabase.auth.getSession()`). The badge will show `!` if the last capture failed—open the popup to read and clear the error.

## Environment overrides

The popup defaults to auto-detection based on the build channel, but you can lock the extension to a specific environment (development, staging, production). Each environment maintains its own session token and optional expiry.

## Packaging automation

The `npm run package` script zips the extension (excluding `dist/` and `node_modules/`) so it can be uploaded to the Chrome Web Store. Update `manifest.json`'s `version` and `version_name` before shipping.
