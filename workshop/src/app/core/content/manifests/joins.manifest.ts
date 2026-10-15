import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const JOINS: TutorialManifest = {
  slug: 'joins',
  number: 5,
  title: 'JOINs',
  subtitle: 'Combinar tablas con INNER y LEFT JOIN',
  summary:
    'Junta datos de varias tablas: INNER JOIN, LEFT JOIN y el anti-join, la trampa de filtrar en WHERE, relaciones ' +
    'de muchos a muchos e informes con nombres, y mide por qué las claves foráneas necesitan un índice.',
  level: 'beginner',
  estimatedMinutes: 115,
  topics: ['INNER JOIN', 'LEFT JOIN', 'Anti-join', 'N:M', 'Índices en FK'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Las consultas que muestran nombres en lugar de ids: pedidos con su cliente, líneas con producto y categoría, ' +
    'clientes que nunca compraron, productos sin ventas y los informes de ventas por categoría y por cliente.',
  steps: [
    step(1, 'inner-join', 'INNER JOIN', 25, 3),
    step(2, 'left-join', 'LEFT JOIN y lo que no existe', 30, 3),
    step(3, 'multiple-joins', 'Unir varias tablas', 25, 3),
    step(4, 'joins-and-aggregates', 'JOINs con agregaciones', 35, 4),
  ],
};
