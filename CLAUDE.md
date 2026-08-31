# CLAUDE.md

## Project

Technotopia — an e-commerce platform: an admin panel plus a customer-facing
storefront (EN/FA). Both are built. Built wireframe-first: every screen traces
back to `technotopia-admin-v3_1.excalidraw`, with storefront design references in
`design/storefront/`. See `TASKS.md` for the phased build order and current status —
work through it one task per session, don't jump ahead.

## Core Principles

- Prefer simplicity over abstraction.
- Avoid over-engineering.
- Every folder and file must have a clear purpose.
- Keep code easy to understand for a solo developer.
- Optimize for maintainability over cleverness.
- If functionality is unclear, ask instead of assuming.

---

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS
- HeroUI
- Zustand
- PostgreSQL
- Prisma 7 — requires a driver adapter (`@prisma/adapter-pg`); there is no
  built-in query engine anymore. Connection config lives in `prisma.config.ts`,
  not just `.env`.
- React Hook Form + Zod
- JWT + bcryptjs + HTTP-only cookies (auth)
- Next.js Route Handlers (REST) for the API layer
- date-fns
- pnpm
- Docker + Docker Compose + Nginx + Ubuntu VPS (deployment — see `DEPLOYMENT.md`
  once Phase 14 of the task list is reached; not a concern for day-to-day feature work)

---

## Folder Structure

Use this structure unless there's a strong reason not to. No `src/` prefix.

```
app/
  (auth)/login/
  admin/                # protected route group — every admin screen lives here
  api/admin/             # Route Handlers, one folder per resource
components/
  ui/                   # shared primitives (buttons, inputs, pills)
  admin/                 # composed admin components (DataTable, Form fields, AdminShell)
lib/                    # auth, db client, validation schemas, generic utils
server/                 # service/data-access layer — route handlers call into here, not Prisma directly
types/
prisma/
  schema.prisma
  prisma.config.ts
```

Do not create unnecessary layers. If a task doesn't need a new top-level folder, don't add one.

---

## TypeScript Rules

- Strict mode enabled.
- Avoid `any`.
- Prefer explicit types over inferred-and-hoped-for.
- Extract reusable types to `types/` when used in more than one place; otherwise keep them next to usage.

---

## React Rules

- Prefer Server Components. Use Client Components only when interactivity requires it
  (forms, modals, anything with `useState`/`onClick`).
- Keep components small and focused — one screen's worth of composition should read
  like an outline, not a wall of JSX.
- Avoid prop drilling when Zustand is the better fit (see State Management).
- Every list screen is built on the shared `components/admin/DataTable`. Every form
  screen is built on the shared `components/admin/form/*` primitives. Don't build a
  bespoke table or form when the shared one covers it — extend the shared component
  instead.

---

## State Management

- Zustand for client global state (auth session, anything genuinely cross-cutting).
- Server Components for server state — fetch there, pass down as props.
- Avoid unnecessary global stores. Local `useState` first; Zustand only when state
  needs to survive across routes/components that aren't parent-child.

---

## Forms

- React Hook Form + Zod (`zodResolver`) for every form, no exceptions.
- Validate on both client (immediate feedback) and server (never trust the client).
- Reuse the shared field components (`TextField`, `SelectField`, `TagsInput`,
  `ImageUploadField`, `ToggleField`, `TextareaField`) — see `components/admin/form/`.

---

## Database

- Prisma 7 with `@prisma/adapter-pg` — `PrismaClient` requires the adapter passed in
  at construction; `new PrismaClient()` with no adapter will throw.
- Schema lives at `prisma/schema.prisma`; connection config in `prisma.config.ts`.
- Every model: `id` (cuid), `createdAt`, `updatedAt`.
- Proper relations, not loose foreign-key-shaped strings.
- Soft delete where a hard delete would orphan history (e.g. products referenced by
  past orders get deactivated, not deleted — see the task list's delete-guard notes).
- Any schema change: update `schema.prisma` and the migration together, then run
  `pnpm prisma generate`.

---

## API Rules

- Route Handlers under `app/api/admin/<resource>/route.ts` are the standard pattern
  for this project — this is a deliberate choice, not a default; don't switch to
  Server Actions for admin CRUD without discussing it first.
- Route handlers stay thin: parse + validate the request (Zod), call into `server/`
  for the actual logic, shape the response. No Prisma calls directly inside a route
  handler.
- Every response follows `{ success: true, data }` or `{ success: false, error }`.
- Validate every input with Zod — path params, query params, and body.

---

## Authentication & Security

- JWT signed on login, stored in an HTTP-only, Secure (production), SameSite=Lax cookie.
  `bcryptjs` for password hashing.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` — use `proxy.ts` for route
  protection (redirect unauthenticated/non-admin requests away from `/admin/*`).
- **Don't rely on `proxy.ts` alone for auth.** It's a routing-layer convenience, not
  a security boundary by itself — verify the JWT and role again inside every
  route handler / server action that touches admin data. Defense in depth, not
  duplicated trust.
- Never trust client-supplied data — re-validate everything server-side even if the
  client already validated it.
- Secrets in environment variables only. Never hardcoded, never logged.

---

## Styling

- Tailwind CSS + HeroUI components.
- Mobile-first, consistent spacing scale.
- Keep layouts clean.

Avoid:

- Random one-off colors outside the theme palette.
- Heavy shadows.
- Excessive animation.

---

## Performance

- Server Components by default; lazy-load heavy Client Components.
- Optimize images (Next.js `<Image>`, not raw `<img>`).
- Avoid unnecessary re-renders — check before reaching for `useEffect`.
- Keep bundle size in mind; don't import a whole library for one function.

---

## Code Quality — before finishing any task

- Remove dead code and duplicate code.
- `pnpm lint` clean.
- `pnpm tsc --noEmit` clean.
- `pnpm build` succeeds if the change touched routing/build behavior.
- Schema change → also `pnpm prisma generate` and confirm the migration applies.
- Verify responsive layout and basic accessibility (labels on inputs, focus states,
  contrast) on any new screen.
- Choose the simplest solution that satisfies the task — don't add abstraction for
  a hypothetical future need.

---

## Wireframe Rules

`technotopia-admin-v3.excalidraw` defines the required functionality. It is the
source of truth for what each screen contains.

When implementing a screen:

- Do not invent new features.
- Do not add extra filters, columns, or fields beyond what's in the frame.
- Do not add dashboards, analytics, or charts unless the frame shows them.
- Do not add extra buttons or additional CRUD operations.
- Do not change the page flow (list → form/detail pattern stays as designed).
- Only improve visual appearance, responsiveness, accessibility, and code quality
  beyond what the wireframe literally shows.

If functionality is unclear or a field's purpose is ambiguous, ask — don't guess and
don't quietly "improve" scope.

---

## Deployment

Out of scope for day-to-day feature tasks. Phase 14 already produced a working
generic-VPS setup (Dockerfile, compose, nginx, `DEPLOYMENT.md`). Phase 25 — deploying
to a real host — is **deferred until a server exists**; see `TASKS.md`. Don't
containerize or touch deploy config as a side effect of an unrelated task.
