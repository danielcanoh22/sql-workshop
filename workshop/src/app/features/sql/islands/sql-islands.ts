import { IslandRegistry } from '../../../core/content/islands';
import { SqlChallenge } from './sql-challenge';
import { SqlCompare } from './sql-compare';
import { SqlRunner } from './sql-runner';

/** Interactive blocks available to tutorial Markdown, by the `data-island` name the renderer emits. */
export const SQL_ISLANDS: IslandRegistry = {
  runner: SqlRunner,
  challenge: SqlChallenge,
  compare: SqlCompare,
};
