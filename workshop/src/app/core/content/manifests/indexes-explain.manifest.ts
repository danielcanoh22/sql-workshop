import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const INDEXES_EXPLAIN: TutorialManifest = {
  slug: 'indexes-explain',
  number: 12,
  title: 'Índices y EXPLAIN',
  subtitle: 'Por qué una consulta es lenta y cómo arreglarla',
  summary:
    'Entiende qué es un índice y qué cuesta, lee planes de ejecución con EXPLAIN y EXPLAIN ANALYZE, descubre por qué ' +
    'PostgreSQL a veces ignora un índice y diseña índices de varias columnas que también evitan ordenar.',
  level: 'intermediate',
  estimatedMinutes: 110,
  topics: ['Índices', 'EXPLAIN', 'EXPLAIN ANALYZE', 'Índices compuestos', 'Selectividad'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Los índices que necesitan las pantallas de la tienda (búsqueda de clientes, "mis pedidos", la cola del ' +
    'almacén y la página de cada categoría), decididos a partir de sus consultas y comprobados con planes reales.',
  steps: [
    step(1, 'how-indexes-work', 'Cómo funciona un índice', 25, 1),
    step(2, 'explain', 'Leer planes con EXPLAIN', 30, 0),
    step(3, 'composite-indexes', 'Índices de varias columnas', 30, 1),
    step(4, 'practice', 'Práctica final', 25, 2),
  ],
};
