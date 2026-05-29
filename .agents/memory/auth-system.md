---
name: Auth system
description: How user authentication is implemented in TN Bus+ and the zod/v4 esbuild quirk
---

## Auth architecture
- API routes: `POST /api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `GET /api/auth/me`
- Session via `express-session` with `SESSION_SECRET` env var; memory store (fine for demo)
- Passwords hashed with `bcryptjs` (12 rounds)
- Session stores `passengerId` on `req.session`
- Frontend: `AuthContext` wraps entire app, calls `/api/auth/me` on mount, exposes `user`, `login`, `signup`, `logout`, `refresh`
- Protected pages use `ProtectedRoute` component — redirects to `/login` if not authenticated

## Critical quirk
**`zod/v4` (subpath export) cannot be imported in `artifacts/api-server` routes** — esbuild fails to resolve the path at build time. Use manual validation or import schemas from `@workspace/api-zod` (which already handles this).

**Why:** esbuild's subpath export resolution in the api-server build config doesn't handle `zod/v4`. Discovered when adding auth routes.

**How to apply:** Any new api-server route that needs Zod validation should either do manual type-guard validation (like `auth.ts`) or import from `@workspace/api-zod`.
