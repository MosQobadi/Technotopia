# AGENTS.md

Read this before starting any task. It documents the conventions this repo follows
so that behavior stays consistent across many separate Claude Code sessions. See
`CLAUDE.md` for the fuller project brief (stack, principles, wireframe rules) and
`technotopia-claude-code-tasks.md` for the phased task list — work through it in
order, one task per session.

---

## Folder Structure

No `src/` prefix. Structure:

```
app/
  (auth)/
    login/              # public login route
  admin/                # protected route group — every admin screen lives here
  api/                  # Route Handlers, one folder per resource (e.g. api/admin/products/)
components/
  ui/                   # shared, generic primitives (buttons, inputs, pills) —
                         # no admin-specific or business logic here
  admin/                # admin-composed components (DataTable, form primitives,
                         # AdminShell, and other components built from `ui/` plus
                         # domain knowledge)
lib/                    # auth, db client, validation schemas (Zod), generic utils —
                         # framework-adjacent code with no JSX
server/                 # data access / service layer — route handlers call into
                         # here, never Prisma directly
types/                  # shared TypeScript types used in more than one place
prisma/
  schema.prisma
  prisma.config.ts
```

Don't create a new top-level folder unless a task genuinely needs one. Don't add
depth for its own sake — a flat, obvious structure beats a "correct" deep one.

---

## Naming Conventions

- **Components:** PascalCase, one component per file, filename matches the export
  (e.g. `DataTable.tsx`, `ProductForm.tsx`).
- **Functions & variables:** camelCase (`getCurrentUser`, `computeFinalPrice`).
- **Routes (URL segments / route folders):** kebab-case (e.g. `app/admin/order-items/`
  if such a route existed). Route group folders keep their parenthesized form,
  e.g. `(auth)`.
- **Types & interfaces:** PascalCase, no `I`/`T` prefix (`Product`, not `IProduct`).
- **Zod schemas:** camelCase with a `Schema` suffix (`productSchema`, `loginSchema`).
- **Files that aren't components** (utils, schemas, service modules): camelCase
  (`auth.ts`, `slugify.ts`) matching the primary export's purpose.

---

## Shared Components — use them, don't rebuild them

- **Every list screen** is built on the shared `components/admin/DataTable`
  component (built in a later task). Don't hand-roll a table for a single module.
- **Every form** is built on the shared `components/admin/form/` primitives
  (`TextField`, `TextareaField`, `SelectField`, `TagsInput`, `ImageUploadField`,
  `ToggleField`, `FormActions` — built in a later task). Don't hand-roll form
  fields or duplicate validation-error styling for a single module.
- If a screen's needs don't fit the shared component, extend the shared
  component — don't fork it into a one-off.

---

## Everything else

Tech stack, architectural principles, TypeScript/React/API/auth rules, styling,
and wireframe rules live in `CLAUDE.md` — this file only covers structure and
naming so it doesn't drift out of sync with that fuller document.
