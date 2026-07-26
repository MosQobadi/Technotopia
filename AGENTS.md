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
  component. Don't hand-roll a table for a single module.
- **Every form** is built on the shared `components/admin/form/` primitives
  (`TextField`, `TextareaField`, `SelectField`, `TagsInput`, `ImageUploadField`,
  `ToggleField`, `FormActions` — built in a later task). Don't hand-roll form
  fields or duplicate validation-error styling for a single module.
- If a screen's needs don't fit the shared component, extend the shared
  component — don't fork it into a one-off.

### `components/admin/DataTable`

Generic, module-agnostic list table built on HeroUI's `Table`/`Select`/
`SearchField`/`Pagination` primitives. Nothing product/order/category-specific
lives in this file — module screens pass columns and data in as props. Demo
usage with mock data: `app/dev-preview/DataTableDemo.tsx` (rendered from
`app/dev-preview/page.tsx`).

```ts
interface DataTableColumn<T> {
  key: keyof T & string;       // column also used as the default cell value lookup
  label: string;                // header text
  render?: (row: T) => ReactNode; // optional custom cell renderer (e.g. StatusPill, formatted price)
}

interface DataTableFilter {
  label: string;                 // shown as the "All" option and the select's placeholder text
  value: string;                 // "" means no filter applied ("All")
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[];
  rows: T[];                     // already-paginated rows for the current page
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;   // debounced, fires searchDebounceMs after typing stops
  searchDebounceMs?: number;    // default 300
  filters?: DataTableFilter[];  // renders one Select per filter, next to the search box
  page: number;                 // 1-indexed current page
  pageSize: number;
  total: number;                // total row count across all pages (drives pagination + summary text)
  onPageChange: (page: number) => void;
  emptyMessage?: string;        // default "No results found."
  "aria-label": string;         // required, accessible name for the underlying table
}
```

`DataTable` is presentation-only — it does not fetch, filter, or paginate
data itself. The caller (a Server Component fetching from the API, or a
client wrapper managing local state) owns `rows`/`total`/`page` and passes
already-sliced data in.

Also exported: `StatusPill({ value: string })` — renders a colored HeroUI
`Chip` pill. Use it as a column's `render` fn for any status-like field.
Color mapping (case/whitespace-insensitive match on `value`):

| Color              | Statuses                                   |
| ------------------ | ------------------------------------------- |
| green (`success`)  | Active, In Stock, Delivered, Paid           |
| red (`danger`)     | Inactive, Out of Stock, Cancelled           |
| orange (`warning`) | Pending, Low Stock                          |
| blue (`accent`)    | Sending, Sent                               |

Unrecognized status strings fall back to the neutral `default` chip color
rather than throwing — extend `STATUS_PILL_COLOR` in `DataTable.tsx` if a
new status value needs a mapping.

---

## Everything else

Tech stack, architectural principles, TypeScript/React/API/auth rules, styling,
and wireframe rules live in `CLAUDE.md` — this file only covers structure and
naming so it doesn't drift out of sync with that fuller document.
