/** Messages exchanged between `SqlEngineService` (main thread) and `sql.worker.ts`. */

export type EngineMethod = 'load' | 'reset' | 'run' | 'schema' | 'preview' | 'check' | 'compare';

export interface WorkerRequest {
  readonly id: number;
  /** `init` receives the absolute URL of the folder holding pglite.wasm, initdb.wasm and pglite.data. */
  readonly method: EngineMethod | 'init';
  readonly args: readonly unknown[];
}

export type WorkerResponse =
  | { readonly id: number; readonly ok: true; readonly value: unknown }
  | { readonly id: number; readonly ok: false; readonly message: string };
