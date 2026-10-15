export type TutorialLevel = 'beginner' | 'intermediate' | 'advanced' | 'project';
export type TutorialStatus = 'available' | 'coming-soon';

export interface TutorialStep {
  /** URL-safe identifier, unique inside a tutorial (e.g. `what-is-a-database`). */
  readonly id: string;
  readonly title: string;
  /** Markdown file name inside `/tutorials/<slug>/` (e.g. `01-what-is-a-database.md`). */
  readonly file: string;
  readonly estimatedMinutes: number;
}

export interface TutorialManifest {
  /** Folder name under `public/tutorials/` and the URL segment. */
  readonly slug: string;
  readonly number: number;
  readonly title: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly level: TutorialLevel;
  readonly estimatedMinutes: number;
  readonly topics: readonly string[];
  readonly status: TutorialStatus;
  readonly whatYouWillBuild?: string;
  readonly steps: readonly TutorialStep[];
}

export const LEVEL_LABELS: Record<TutorialLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  project: 'Proyecto final',
};

/** Catalog order: one section per level, from the easiest to the capstone projects. */
export const LEVEL_ORDER: readonly TutorialLevel[] = ['beginner', 'intermediate', 'advanced', 'project'];

export const LEVEL_SECTION_TITLES: Record<TutorialLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  project: 'Proyectos finales',
};
