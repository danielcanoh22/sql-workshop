import { Injectable, inject, signal } from '@angular/core';
import { PROGRESS_STORAGE } from './progress.service';

export const CHALLENGE_STORAGE_KEY = 'sql-workshop.challenges.v1';

interface ChallengeEntry {
  readonly solved?: true;
  /** Last answer typed in the editor, restored on the next visit. */
  readonly answer?: string;
}

type ChallengeState = Readonly<Record<string, ChallengeEntry>>;

/**
 * Identifies a challenge by tutorial, step and title. Renaming a challenge forgets its progress, which is acceptable
 * and spares authors from maintaining ids by hand (the content spec keeps titles unique within a step).
 */
export function challengeKey(slug: string, stepId: string, title: string): string {
  return `${slug}/${stepId}/${title}`;
}

/** Keeps only well-formed entries so a corrupted payload can never break the app. */
function sanitize(raw: unknown): ChallengeState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};

  const result: Record<string, ChallengeEntry> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { solved, answer } = entry as Record<string, unknown>;
    result[key] = {
      ...(solved === true ? { solved: true as const } : {}),
      ...(typeof answer === 'string' ? { answer } : {}),
    };
  }
  return result;
}

/** Solved challenges and last answers, kept in the browser like the step progress. */
@Injectable({ providedIn: 'root' })
export class ChallengeProgressService {
  private readonly storage = inject(PROGRESS_STORAGE);
  private readonly state = signal<ChallengeState>(this.load());

  answer(key: string): string | undefined {
    return this.state()[key]?.answer;
  }

  saveAnswer(key: string, answer: string): void {
    if (this.answer(key) === answer) return;
    this.update(key, { ...this.state()[key], answer });
  }

  clearAnswer(key: string): void {
    const { answer: _removed, ...rest } = this.state()[key] ?? {};
    this.update(key, rest);
  }

  /** Reactive when read inside a template or `computed`. */
  isSolved(key: string): boolean {
    return this.state()[key]?.solved === true;
  }

  markSolved(key: string): void {
    if (this.isSolved(key)) return;
    this.update(key, { ...this.state()[key], solved: true });
  }

  /** Reactive when read inside a template or `computed`. */
  solvedCount(slug: string, stepId: string): number {
    const prefix = challengeKey(slug, stepId, '');
    return Object.entries(this.state()).filter(([key, entry]) => key.startsWith(prefix) && entry.solved).length;
  }

  private update(key: string, entry: ChallengeEntry): void {
    this.state.update((state) => {
      const { [key]: _previous, ...rest } = state;
      return entry.solved || entry.answer !== undefined ? { ...rest, [key]: entry } : rest;
    });
    this.persist();
  }

  private load(): ChallengeState {
    try {
      const raw = this.storage?.getItem(CHALLENGE_STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(this.state()));
    } catch {
      // Storage may be blocked or full: progress still works for the current session.
    }
  }
}
