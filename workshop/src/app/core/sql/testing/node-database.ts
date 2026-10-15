// Test-only helper: creates real PGlite databases in Node. Specs that use it must run in the `node` environment.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Database, DatabaseFactory } from '../sql-engine';
import { DISPLAY_PARSERS } from '../value-format';

const DIST = join(process.cwd(), 'node_modules', '@electric-sql', 'pglite', 'dist');

let assets: Promise<{ pgliteWasmModule: WebAssembly.Module; initdbWasmModule: WebAssembly.Module; fsBundle: Blob }> | undefined;

// The test bundle moves PGlite away from its assets, so they are handed over explicitly (as the worker does).
function loadAssets() {
  assets ??= Promise.all([
    WebAssembly.compile(readFileSync(join(DIST, 'pglite.wasm'))),
    WebAssembly.compile(readFileSync(join(DIST, 'initdb.wasm'))),
  ]).then(([pgliteWasmModule, initdbWasmModule]) => ({
    pgliteWasmModule,
    initdbWasmModule,
    fsBundle: new Blob([readFileSync(join(DIST, 'pglite.data'))]),
  }));
  return assets;
}

export const createNodeDatabase: DatabaseFactory = async (snapshot) =>
  (await PGlite.create({
    ...(await loadAssets()),
    parsers: DISPLAY_PARSERS,
    ...(snapshot ? { loadDataDir: snapshot } : {}),
  })) as unknown as Database;

/** Reads a dataset seed from `public/datasets/`. */
export function readDataset(name: string): string {
  return readFileSync(join(process.cwd(), 'public', 'datasets', `${name}.sql`), 'utf8');
}
