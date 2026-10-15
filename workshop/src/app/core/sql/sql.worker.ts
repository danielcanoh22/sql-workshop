/// <reference lib="webworker" />
import { PGlite } from '@electric-sql/pglite';
import { Database, DatabaseFactory, SqlEngine } from './sql-engine';
import { WorkerRequest, WorkerResponse } from './sql-protocol';
import { DISPLAY_PARSERS } from './value-format';

let engine: SqlEngine | undefined;
// Requests run one after another: engine operations (load, reset, run...) must never interleave.
let queue: Promise<void> = Promise.resolve();

addEventListener('message', ({ data }: MessageEvent<WorkerRequest>) => {
  queue = queue.then(() => handle(data));
});

async function handle(request: WorkerRequest): Promise<void> {
  let response: WorkerResponse;
  try {
    response = { id: request.id, ok: true, value: await dispatch(request) };
  } catch (error) {
    response = { id: request.id, ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  postMessage(response);
}

function dispatch({ method, args }: WorkerRequest): Promise<unknown> {
  if (method === 'init') {
    engine = new SqlEngine(browserFactory(String(args[0])));
    return Promise.resolve(null);
  }
  if (!engine) {
    throw new Error('The SQL worker was not initialized.');
  }
  const target = engine as unknown as Record<string, (...params: unknown[]) => Promise<unknown>>;
  return target[method].apply(engine, [...args]);
}

/**
 * The PGlite assets are served from `pglite/` (see angular.json) and handed over explicitly: the bundler moves the
 * library away from the files it would otherwise look for next to itself. They are downloaded once per worker.
 */
function browserFactory(assetsUrl: string): DatabaseFactory {
  const assets = Promise.all([
    WebAssembly.compileStreaming(fetch(new URL('pglite.wasm', assetsUrl))),
    WebAssembly.compileStreaming(fetch(new URL('initdb.wasm', assetsUrl))),
    fetch(new URL('pglite.data', assetsUrl)).then((response) => response.blob()),
  ]);

  return async (snapshot) => {
    const [pgliteWasmModule, initdbWasmModule, fsBundle] = await assets;
    const db = await PGlite.create({
      pgliteWasmModule,
      initdbWasmModule,
      fsBundle,
      parsers: DISPLAY_PARSERS,
      ...(snapshot ? { loadDataDir: snapshot } : {}),
    });
    return db as unknown as Database;
  };
}
