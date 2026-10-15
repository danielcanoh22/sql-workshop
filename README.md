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
   (slug, number, title, subtitle, summary, level, estimatedMinutes, topics, `status: 'available'`, `dataset`,
   steps `{ id, title, file, estimatedMinutes, challenges }` where `challenges` is the number of auto-checked challenges)
   and remove its placeholder from `coming-soon.manifests.ts`.
3. **Register**: add ONE line to the array in `workshop/src/app/core/content/registry.ts`.

Levels are `beginner`, `intermediate`, `advanced` and `project`; the catalog shows one section per level.

`bun run test` also validates the content of every available tutorial against its dataset
(`src/app/core/content/tutorial-content.spec.ts`): every runnable block runs, every challenge solution passes its own
check and lists its columns (no `SELECT *`), and every comparison returns the same rows in all variants with the
`best` one reading the fewest pages.

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
- ```` ```sql run error ```` marks an example that fails on purpose (e.g. a constraint rejecting bad data): it shows an
  **Error esperado** badge, and the content spec checks that it really fails.
- A `::::challenge` whose `:::solution` contains a ```` ```sql ```` fence becomes **auto-checked**: an answer
  editor with **Ejecutar** and **Comprobar** appears after the statement. Checking runs the answer and the solution
  on fresh copies of the dataset and compares their results (column names are ignored; values, row counts and,
  with ```` ```sql ordered ````, row order are not), so any correct query passes. Optional hidden fences inside
  the challenge: ```` ```sql starter ```` (initial editor content), ```` ```sql verify ```` (query compared after
  data-changing answers, e.g. `UPDATE`) and ```` ```sql setup ```` (runs before answer and solution).
  A conceptual challenge can still show SQL in its solution with ```` ```sql example ````, which does not make it
  auto-checked.
- For schema challenges (`CREATE TABLE`, `ALTER TABLE`), check **behavior** in the verify query with the dataset helper
  `workshop.try(statement, result_query DEFAULT NULL)` (schema `workshop`, invisible in the data panel). It runs the
  statement(s), undoes them, and returns `'ok'`, `'not null'`, `'unique'`, `'check'`, `'foreign key'`, `'no table'`,
  `'no column'` or the SQLSTATE; with `result_query` it returns that query's value instead of `'ok'` (e.g. to see a
  cascade). Combine probes and `information_schema.columns` rows with `UNION ALL` so the learner sees, row by row,
  which rule their table does not enforce.
- `:::compare Title` shows several ways to get the same data and compares them with `EXPLAIN (ANALYZE, BUFFERS)`
  on the same fresh copy of the dataset: same result?, rows returned, rows read, **pages read** (the headline,
  machine-independent metric), time (indicative), scan types and the plan tree. Inside it, every
  ```` ```sql variant label="..." ```` fence (add `best` to the recommended one) is a single editable statement
  followed by the Markdown that explains it, shown after the run so learners predict first.
  ```` ```sql setup ```` runs before all variants (e.g. `generate_series` to make the data large enough to matter);
  ```` ```sql variant-setup ```` prepares only the next variant (e.g. `CREATE INDEX`); each variant runs in a
  transaction that is rolled back. Correct challenge answers can also be compared with the recommended solution.
  If a variant depends on the ids of rows generated in `setup`, insert them with **explicit ids**: checks and
  comparisons run on a copy restored from a snapshot, and PostgreSQL sequences jump ahead (they are logged 32
  values at a time), so generated ids differ from a freshly seeded database.
- Interactive blocks are "islands": the renderer emits a `data-island` placeholder and `MarkdownView` mounts the
  component registered in `features/sql/islands/sql-islands.ts`.
- Highlighted languages: `sql`, `json`, `bash`.
- Markdown is trusted content (sanitization is disabled on purpose), so never render untrusted input with this engine.

Progress is stored in `localStorage`: completed steps in `sql-workshop.progress.v1`; solved challenges and the last
answer of each challenge in `sql-workshop.challenges.v1`, keyed by `<tutorial>/<step>/<challenge title>` (so challenge
titles must be unique within a step, and renaming one forgets its progress). The theme is in `sql-workshop.theme.v1`.
