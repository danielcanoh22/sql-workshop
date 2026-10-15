import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EngineStatus, SqlEngineService } from './sql-engine.service';
import { SchemaStore } from './schema.store';
import { SchemaInfo } from './sql.model';

const SCHEMA: SchemaInfo = {
  tables: [
    {
      name: 'customers',
      rowCount: 3,
      columns: [
        { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'text', nullable: false, isPrimaryKey: false },
      ],
    },
  ],
};

function setup(status: EngineStatus) {
  const engine = {
    status: signal<EngineStatus>(status),
    revision: signal(0),
    schema: vi.fn().mockResolvedValue(SCHEMA),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SqlEngineService, useValue: engine }] });
  const store = TestBed.inject(SchemaStore);
  const settle = () => TestBed.inject(ApplicationRef).whenStable();
  return { engine, store, settle };
}

describe('SchemaStore', () => {
  it('reads the schema once the engine is ready', async () => {
    const { engine, store, settle } = setup('ready');
    store.schema();
    await settle();

    expect(engine.schema).toHaveBeenCalledTimes(1);
    expect(store.schema()).toEqual(SCHEMA);
  });

  it('does not query the engine before it is ready', async () => {
    const { engine, store, settle } = setup('loading');
    store.schema();
    await settle();

    expect(engine.schema).not.toHaveBeenCalled();
    expect(store.schema()).toBeUndefined();
  });

  it('re-reads the schema whenever the playground changes', async () => {
    const { engine, store, settle } = setup('ready');
    store.schema();
    await settle();

    engine.revision.set(1);
    store.schema();
    await settle();

    expect(engine.schema).toHaveBeenCalledTimes(2);
  });

  it('exposes tables and columns for editor autocompletion', async () => {
    const { store, settle } = setup('ready');
    store.schema();
    await settle();

    expect(store.completion()).toEqual({ customers: ['id', 'name'] });
  });
});
