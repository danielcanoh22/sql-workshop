import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideWorkshopMarkdown } from './core/content/markdown.providers';
import { WorkshopTitleStrategy } from './core/content/route-titles';
import { SQL_WORKER_FACTORY } from './core/sql/sql-engine.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    { provide: TitleStrategy, useExisting: WorkshopTitleStrategy },
    provideHttpClient(withFetch()),
    provideWorkshopMarkdown(),
    {
      provide: SQL_WORKER_FACTORY,
      useValue: () => new Worker(new URL('./core/sql/sql.worker', import.meta.url), { type: 'module' }),
    },
  ],
};
