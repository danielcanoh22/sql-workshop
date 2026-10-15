# SQL Workshop

Interactive, concept-first tutorials to learn the SQL that real applications use, first as general SQL and then
PostgreSQL. Every query runs in the browser against a real PostgreSQL engine ([PGlite](https://pglite.dev), Postgres
compiled to WebAssembly), so there is nothing to install besides the workshop app itself.
The tutorial text and the workshop UI are in Spanish; all code is in English.

| Folder | What it is |
| --- | --- |
| `workshop/` | Angular 22 app (catalog by level, overview, step reader, progress, in-browser SQL). |
| `odd/` | Feature planning notes. |

## Run the workshop app

Requirements: Node 24, [bun](https://bun.sh).

```bash
cd workshop
bun install
bun run start        # http://localhost:4200
bun run test         # unit tests (Angular unit-test builder + Vitest)
bun run build        # production build in workshop/dist
```

> `katex` and `marked-katex-extension` are installed even though the workshop does not render math:
> ngx-markdown dynamically imports `marked-katex-extension`, and the Vite dev server fails with
> HTTP 500 on the ngx-markdown module when that optional peer cannot be resolved.

## How to add a tutorial

1. **Content**: create `workshop/public/tutorials/<slug>/` with `overview.md` and one file per step (`01-some-step.md`, ...).
2. **Manifest**: create `workshop/src/app/core/content/manifests/<slug>.manifest.ts` exporting a `TutorialManifest`
   (slug, number, title, subtitle, summary, level, estimatedMinutes, topics, `status: 'available'`, steps `{ id, title, file, estimatedMinutes }`)
   and remove its placeholder from `coming-soon.manifests.ts`.
3. **Register**: add ONE line to the array in `workshop/src/app/core/content/registry.ts`.

Levels are `beginner`, `intermediate`, `advanced` and `project`; the catalog shows one section per level.

## Markdown syntax for authors

Standard Markdown plus these blocks. A container opens with `:::type Optional title` and closes with a line containing
only `:::`.

````markdown
:::concept Title      <!-- concept | why | tip | warning | postgres | checkpoint | troubleshooting | recap -->
Any **Markdown**, lists, code fences...
:::

::::challenge Title   <!-- 4 colons so the inner 3-colon blocks can nest -->
Statement...

:::hint
First hint (add as many as you need; they are numbered automatically)
:::

:::solution
```sql
SELECT name FROM customers;
```
:::
::::
````

- Code fences accept `title="path/file.sql"` to show a filename header. Every code block has a copy button.
- ```` ```sql run ```` (optionally `title="Caption"`) renders an editable SQL block with a **Ejecutar** button
  (Ctrl/Cmd + Enter) that runs against the tutorial playground. Set `dataset` in the manifest to load
  `workshop/public/datasets/<dataset>.sql`; the playground keeps the learner's changes while they stay in the tutorial.
- Interactive blocks are "islands": the renderer emits a `data-island` placeholder and `MarkdownView` mounts the
  component registered in `features/sql/islands/sql-islands.ts`.
- Highlighted languages: `sql`, `json`, `bash`.
- Markdown is trusted content (sanitization is disabled on purpose), so never render untrusted input with this engine.

Progress is stored in `localStorage` (`sql-workshop.progress.v1`), the theme in `sql-workshop.theme.v1`.
