import { COMING_SOON } from './manifests/coming-soon.manifests';
import { SUBQUERIES_CTES } from './manifests/subqueries-ctes.manifest';
import { JOINS } from './manifests/joins.manifest';
import { AGGREGATES_GROUP_BY } from './manifests/aggregates-group-by.manifest';
import { ORDER_LIMIT } from './manifests/order-limit.manifest';
import { RELATIONAL_MODEL } from './manifests/relational-model.manifest';
import { SELECT_WHERE } from './manifests/select-where.manifest';
import { TutorialManifest } from './tutorial.model';

/**
 * Single registration point. To add a tutorial:
 *   1. create `public/tutorials/<slug>/` with `overview.md` and the step files,
 *   2. create its manifest in `./manifests/`,
 *   3. add ONE line to this array.
 */
export const TUTORIAL_REGISTRY: readonly TutorialManifest[] = [
  RELATIONAL_MODEL,
  SELECT_WHERE,
  ORDER_LIMIT,
  AGGREGATES_GROUP_BY,
  JOINS,
  SUBQUERIES_CTES,
  ...COMING_SOON,
];

function duplicates(values: readonly (string | number)[]): (string | number)[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

/** Returns human-readable problems; an empty array means the manifests are consistent. */
export function validateManifests(manifests: readonly TutorialManifest[]): string[] {
  const problems: string[] = [];

  for (const slug of new Set(duplicates(manifests.map((m) => m.slug)))) {
    problems.push(`Duplicated slug: ${slug}`);
  }
  for (const number of new Set(duplicates(manifests.map((m) => m.number)))) {
    problems.push(`Duplicated number: ${number}`);
  }

  for (const manifest of manifests) {
    for (const id of new Set(duplicates(manifest.steps.map((s) => s.id)))) {
      problems.push(`${manifest.slug}: duplicated step id ${id}`);
    }
    for (const file of new Set(duplicates(manifest.steps.map((s) => s.file)))) {
      problems.push(`${manifest.slug}: duplicated step file ${file}`);
    }
    if (manifest.status === 'available' && manifest.steps.length === 0) {
      problems.push(`${manifest.slug}: an available tutorial needs at least one step`);
    }
    if (manifest.status === 'coming-soon' && manifest.steps.length > 0) {
      problems.push(`${manifest.slug}: a coming-soon tutorial must not declare steps`);
    }
  }

  return problems;
}
