import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const SUBQUERIES_CTES: TutorialManifest = {
  slug: 'subqueries-ctes',
  number: 6,
  title: 'Subconsultas y CTEs',
  subtitle: 'Consultas dentro de consultas, EXISTS y WITH',
  summary:
    'Usa el resultado de una consulta dentro de otra: subconsultas escalares y correlacionadas, IN, EXISTS y la ' +
    'trampa de NOT IN, CTEs con WITH, tablas derivadas y el coste de calcular fila a fila.',
  level: 'intermediate',
  estimatedMinutes: 110,
  topics: ['Subqueries', 'EXISTS', 'NOT EXISTS', 'WITH', 'CTE'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Consultas de análisis que necesitan pasos intermedios: productos por encima de la media, clientes que nunca ' +
    'compraron, el pedido más caro de cada cliente y clientes que gastan más que la media.',
  steps: [
    step(1, 'subqueries', 'Subconsultas', 25, 3),
    step(2, 'in-exists', 'IN, EXISTS y NOT EXISTS', 25, 3),
    step(3, 'ctes', 'CTEs con WITH', 30, 3),
    step(4, 'practice', 'Práctica final', 30, 3),
  ],
};
