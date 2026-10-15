import { Injectable, computed, inject, resource } from '@angular/core';
import { SqlEngineService } from './sql-engine.service';
import { SchemaInfo } from './sql.model';

/** Live description of the playground tables, refreshed after every statement. Shared by the data panel and editors. */
@Injectable({ providedIn: 'root' })
export class SchemaStore {
  private readonly engine = inject(SqlEngineService);

  private readonly resource = resource({
    params: () => (this.engine.status() === 'ready' ? { revision: this.engine.revision() } : undefined),
    loader: () => this.engine.schema(),
  });

  /** Undefined until the first read finishes; keeps the previous value while refreshing. */
  readonly schema = computed<SchemaInfo | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  readonly isLoading = this.resource.isLoading;

  /** `{ table: [columns] }`, the shape CodeMirror's SQL autocompletion expects. */
  readonly completion = computed<Record<string, string[]>>(() =>
    Object.fromEntries((this.schema()?.tables ?? []).map((table) => [table.name, table.columns.map((c) => c.name)])),
  );
}
