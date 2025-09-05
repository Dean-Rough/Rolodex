# Release Process (Rolodex)

## Versioning
- Use Semantic Versioning (MAJOR.MINOR.PATCH).
- Update `CHANGELOG.md` with a summary of changes.

## Frontend (Static Export)
- Ensure `NEXT_PUBLIC_API_BASE_URL` points to the correct API.
- Build: `cd frontend && npm ci && npm run build && npm run start` (for static export, deploy `out/`).
- Hosting: add security headers at hosting layer if not served by Next.

## Backend
- Ensure `DATABASE_URL` and any auth provider secrets are set.
- Run DB migrations/DDL (see `docs/schema.sql`).
- Deploy container/app (Fly.io/Heroku/etc.).

## Chrome Extension v2
- Directory: `extension-v2.0.0/`.
- Bump version in `manifest.json`.
- Verify `host_permissions` domains are correct (staging/prod).
- Package: Zip the folder contents (not the parent directory).
- Test: Load unpacked in Chrome; verify popup and context menu; auth handshake; saving works.
- Submit: Upload to Chrome Web Store; attach screenshots, description, and privacy policy if applicable.

## Tagging
- Create a git tag: `git tag vX.Y.Z && git push --tags`.
- Attach artifacts or release notes in GitHub Releases.
