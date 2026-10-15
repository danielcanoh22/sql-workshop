// @vitest-environment node
// Content checks: every SQL block of every available tutorial runs against its dataset, every challenge
// solution passes its own check and follows the workshop's best practices, and every comparison proves its claim.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Marked } from 'marked';
import { SqlEngine } from '../sql/sql-engine';
import { createNodeDatabase, readDataset } from '../sql/testing/node-database';
import { ChallengeIslandProps, CompareIslandProps, workshopMarkdownExtension } from './markdown-blocks';
import { TUTORIAL_REGISTRY } from './registry';

interface Island {
  readonly name: string;
  readonly props: Record<string, unknown>;
}

const TUTORIALS_DIR = join(process.cwd(), 'public', 'tutorials');
const markdown = new Marked(workshopMarkdownExtension);
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

function islands(html: string): Island[] {
  return [...html.matchAll(/data-island="([^"]+)" data-props="([^"]*)"/g)].map(([, name, props]) => ({
    name,
    props: JSON.parse(props.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])),
  }));
}

const available = TUTORIAL_REGISTRY.filter((t) => t.status === 'available');

describe.each(available.map((t) => [t.slug, t] as const))('tutorial %s', (slug, tutorial) => {
  const files = tutorial.steps.map((step) => join(TUTORIALS_DIR, slug, step.file));
  const steps = tutorial.steps.map((step, i) => ({
    id: step.id,
    islands: existsSync(files[i]) ? islands(markdown.parse(readFileSync(files[i], 'utf8'), { async: false }) as string) : [],
  }));
  const of = (name: string) =>
    steps.flatMap((step) => step.islands.filter((island) => island.name === name).map((island) => [step.id, island.props] as const));

  it('has an overview and every step file', () => {
    expect(existsSync(join(TUTORIALS_DIR, slug, 'overview.md'))).toBe(true);
    expect(files.filter((file) => !existsSync(file))).toEqual([]);
  });

  it('declares in the manifest how many auto-checked challenges each step has', () => {
    const declared = tutorial.steps.map((step) => step.challenges ?? 0);
    const actual = steps.map((step) => step.islands.filter((island) => island.name === 'challenge').length);

    expect(declared).toEqual(actual);
  });

  it('gives every auto-checked challenge a title that is unique within its step (it keys the saved progress)', () => {
    for (const step of steps) {
      const titles = step.islands.filter((island) => island.name === 'challenge').map((island) => island.props['title']);

      expect(titles.every((title) => typeof title === 'string' && title.length > 0), step.id).toBe(true);
      expect(new Set(titles).size, step.id).toBe(titles.length);
    }
  });

  if (!tutorial.dataset) {
    it('declares no SQL blocks without a dataset', () => {
      expect(steps.flatMap((step) => step.islands)).toEqual([]);
    });
    return;
  }

  const dataset = tutorial.dataset;
  let engine: SqlEngine;

  beforeAll(async () => {
    engine = new SqlEngine(createNodeDatabase);
    await engine.load(dataset, readDataset(dataset));
  }, 60_000);

  afterAll(() => engine?.dispose());

  it.each(of('runner'))('runnable block in %s behaves as announced: %j', async (_step, props) => {
    await engine.reset();
    const outcome = await engine.run(String(props['code']));

    if (props['expectError']) {
      expect(outcome.ok, 'a block marked `error` must fail').toBe(false);
    } else {
      expect(outcome.ok ? 'ok' : outcome.error.message).toBe('ok');
    }
  });

  it.each(of('challenge'))('challenge solution in %s passes its own check: %j', async (_step, raw) => {
    const props = raw as unknown as ChallengeIslandProps;
    const outcome = await engine.check(props.solutionSql, props);

    expect(outcome.verdict).toBe('correct');
  });

  it.each(of('challenge'))('challenge solution in %s follows the best practices: %j', (_step, raw) => {
    const { solutionSql } = raw as unknown as ChallengeIslandProps;

    expect(solutionSql, 'list the columns instead of SELECT *').not.toMatch(/select\s+\*/i);
    expect(solutionSql, 'quote texts with single quotes').not.toMatch(/=\s*"/);
  });

  it.each(of('compare'))('comparison in %s proves its claim: %j', async (_step, raw) => {
    const props = raw as unknown as CompareIslandProps;
    const { variants } = await engine.compare(
      props.variants.map((variant, i) => ({ id: String(i), sql: variant.sql, ...(variant.setupSql ? { setupSql: variant.setupSql } : {}) })),
      props.setupSql,
    );

    expect(variants.map((v) => (v.run.ok ? 'ok' : v.run.error.message))).toEqual(variants.map(() => 'ok'));
    expect(variants.every((v) => v.sameResultAsFirst), 'every variant returns the same rows').toBe(true);

    const best = props.variants.findIndex((variant) => variant.best);
    if (best !== -1) {
      const pages = variants.map((v) => v.plan!.pagesRead);
      const others = pages.filter((_, i) => i !== best);
      expect(others.every((p) => pages[best] <= p), `best reads the fewest pages: ${pages}`).toBe(true);
      expect(Math.max(...others), `best is clearly better than the worst: ${pages}`).toBeGreaterThan(pages[best] * 2);
    }
  }, 60_000); // setups generate hundreds of thousands of rows
});
