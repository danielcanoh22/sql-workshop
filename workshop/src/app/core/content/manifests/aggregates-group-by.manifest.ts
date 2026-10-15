import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const AGGREGATES_GROUP_BY: TutorialManifest = {
  slug: 'aggregates-group-by',
  number: 4,
  title: 'Agregaciones y GROUP BY',
  subtitle: 'Contar, sumar y resumir datos por grupos',
  summary:
    'Pasa de listar filas a resumirlas: COUNT, SUM, AVG, MIN y MAX, cómo tratan los NULL, resúmenes por grupo ' +
    'con GROUP BY y filtros de grupos con HAVING.',
  level: 'beginner',
  estimatedMinutes: 100,
  topics: ['COUNT', 'SUM', 'AVG', 'GROUP BY', 'HAVING'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Los informes de un panel de administración: clientes por país, pedidos por estado, importe de cada pedido, ' +
    'productos más vendidos y meses con más actividad.',
  steps: [
    step(1, 'aggregate-functions', 'Funciones de agregación', 25, 3),
    step(2, 'group-by', 'Agrupar con GROUP BY', 25, 3),
    step(3, 'having', 'Filtrar grupos con HAVING', 25, 3),
    step(4, 'practice', 'Práctica final', 25, 4),
  ],
};
