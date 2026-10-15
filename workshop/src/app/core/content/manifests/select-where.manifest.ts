import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const SELECT_WHERE: TutorialManifest = {
  slug: 'select-where',
  number: 2,
  title: 'SELECT y WHERE',
  subtitle: 'Pedir exactamente los datos que necesitas',
  summary:
    'Aprende a leer datos de una tienda online real: elegir columnas, filtrar filas con WHERE, combinar ' +
    'condiciones, buscar con IN, BETWEEN y LIKE, y tratar bien los valores NULL.',
  level: 'beginner',
  estimatedMinutes: 125,
  topics: ['SELECT', 'WHERE', 'AND / OR', 'IN', 'BETWEEN', 'LIKE', 'NULL'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Las consultas de lectura que usa cualquier aplicación: listados con las columnas justas, filtros por ' +
    'varios criterios y búsquedas por texto, escritas como las escribiría un profesional.',
  steps: [
    step(1, 'select-basics', 'Tu primer SELECT', 20, 4),
    step(2, 'where-filters', 'Filtrar filas con WHERE', 25, 4),
    step(3, 'in-between-like', 'IN, BETWEEN y LIKE', 30, 5),
    step(4, 'null-values', 'NULL: el valor desconocido', 20, 3),
    step(5, 'practice', 'Práctica final', 30, 4),
  ],
};
