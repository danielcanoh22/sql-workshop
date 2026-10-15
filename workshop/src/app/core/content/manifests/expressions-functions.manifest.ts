import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const EXPRESSIONS_FUNCTIONS: TutorialManifest = {
  slug: 'expressions-functions',
  number: 11,
  title: 'Expresiones y funciones',
  subtitle: 'CASE, COALESCE y funciones de texto y fecha',
  summary:
    'Transforma los datos en la propia consulta: CASE y agregaciones condicionales, COALESCE y NULLIF, funciones ' +
    'de texto y string_agg, fechas, intervalos y generate_series, y la trampa de la división entera.',
  level: 'intermediate',
  estimatedMinutes: 110,
  topics: ['CASE', 'COALESCE', 'Texto', 'Fechas', 'generate_series'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Informes listos para mostrar: segmentos de precio y de cliente, estados traducidos en el orden del proceso, ' +
    'ventas por mes, un calendario sin huecos y etiquetas de texto que no se rompen con NULL.',
  steps: [
    step(1, 'case-coalesce', 'CASE, COALESCE y NULLIF', 30, 4),
    step(2, 'text-functions', 'Funciones de texto', 25, 4),
    step(3, 'dates-numbers', 'Fechas y números', 30, 4),
    step(4, 'practice', 'Práctica final', 25, 3),
  ],
};
