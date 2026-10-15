import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const ORDER_LIMIT: TutorialManifest = {
  slug: 'order-limit',
  number: 3,
  title: 'Ordenar y paginar',
  subtitle: 'ORDER BY, LIMIT y OFFSET: así pagina una app',
  summary:
    'Ordena resultados de forma determinista, quédate con los primeros con LIMIT y pagina como lo hace una ' +
    'aplicación real, comparando OFFSET con la paginación por clave sobre 100 000 filas.',
  level: 'beginner',
  estimatedMinutes: 100,
  topics: ['ORDER BY', 'LIMIT', 'OFFSET', 'Paginación', 'Keyset'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Las consultas de los listados de la tienda: catálogo ordenado, los más recientes, páginas numeradas y un ' +
    '"cargar más" con paginación por clave que cuesta lo mismo en la primera página que en la página 4001.',
  steps: [
    step(1, 'order-by', 'Ordenar con ORDER BY', 25, 4),
    step(2, 'limit-offset', 'LIMIT y OFFSET', 20, 3),
    step(3, 'keyset-pagination', 'Paginación por clave', 30, 2),
    step(4, 'practice', 'Práctica final', 25, 4),
  ],
};
