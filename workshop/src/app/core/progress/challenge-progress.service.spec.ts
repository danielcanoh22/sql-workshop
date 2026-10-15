import { TestBed } from '@angular/core/testing';
import { PROGRESS_STORAGE } from './progress.service';
import { CHALLENGE_STORAGE_KEY, ChallengeProgressService, challengeKey } from './challenge-progress.service';

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function setup(storage: MemoryStorage | null = new MemoryStorage()) {
  TestBed.configureTestingModule({ providers: [{ provide: PROGRESS_STORAGE, useValue: storage }] });
  return { service: TestBed.inject(ChallengeProgressService), storage };
}

const MADRID = challengeKey('select-where', 'where-filters', 'Clientes de Madrid');

describe('ChallengeProgressService', () => {
  it('builds keys from the tutorial, the step and the challenge title', () => {
    expect(MADRID).toBe('select-where/where-filters/Clientes de Madrid');
  });

  it('stores the last answer of a challenge and clears it', () => {
    const { service } = setup();

    expect(service.answer(MADRID)).toBeUndefined();
    service.saveAnswer(MADRID, 'SELECT 1');
    expect(service.answer(MADRID)).toBe('SELECT 1');

    service.clearAnswer(MADRID);
    expect(service.answer(MADRID)).toBeUndefined();
  });

  it('marks challenges as solved and keeps them solved when the answer is cleared', () => {
    const { service } = setup();

    expect(service.isSolved(MADRID)).toBe(false);
    service.saveAnswer(MADRID, 'SELECT 1');
    service.markSolved(MADRID);
    service.clearAnswer(MADRID);

    expect(service.isSolved(MADRID)).toBe(true);
  });

  it('counts the solved challenges of a step', () => {
    const { service } = setup();

    service.markSolved(MADRID);
    service.markSolved(challengeKey('select-where', 'where-filters', 'Otro reto'));
    service.markSolved(challengeKey('select-where', 'null-values', 'Clientes sin ciudad'));
    service.saveAnswer(challengeKey('select-where', 'where-filters', 'Sin resolver'), 'SELECT');

    expect(service.solvedCount('select-where', 'where-filters')).toBe(2);
    expect(service.solvedCount('select-where', 'practice')).toBe(0);
  });

  it('persists under its own storage key and restores on the next visit', () => {
    const storage = new MemoryStorage();
    setup(storage).service.saveAnswer(MADRID, 'SELECT 1');
    TestBed.inject(ChallengeProgressService).markSolved(MADRID);

    expect(JSON.parse(storage.getItem(CHALLENGE_STORAGE_KEY)!)).toEqual({ [MADRID]: { solved: true, answer: 'SELECT 1' } });

    TestBed.resetTestingModule();
    const { service } = setup(storage);
    expect(service.answer(MADRID)).toBe('SELECT 1');
    expect(service.isSolved(MADRID)).toBe(true);
  });

  it('ignores corrupted entries', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify({ ok: { solved: true }, bad: 'x', weird: { solved: 'yes', answer: 3 } }));

    const { service } = setup(storage);

    expect(service.isSolved('ok')).toBe(true);
    expect(service.isSolved('weird')).toBe(false);
    expect(service.answer('weird')).toBeUndefined();
  });

  it('keeps working in memory when storage is unavailable', () => {
    const { service } = setup(null);

    service.markSolved(MADRID);

    expect(service.isSolved(MADRID)).toBe(true);
  });
});
