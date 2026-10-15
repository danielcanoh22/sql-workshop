import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const DATA_MODELING: TutorialManifest = {
  slug: 'data-modeling',
  number: 9,
  title: 'Modelado de datos',
  subtitle: 'Relaciones 1:N, N:M y normalización práctica',
  summary:
    'Decide qué tablas necesita una aplicación: entidades y cardinalidades, normalización sin teoría de más, ' +
    'cuándo desnormalizar a propósito, migrar un mal diseño y patrones como jerarquías y relaciones 1:1.',
  level: 'intermediate',
  estimatedMinutes: 120,
  topics: ['1:N', 'N:M', '1:1', 'Normalización', 'Patrones'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Etiquetas de productos, subcategorías y perfiles de cliente para la tienda, la migración de una tabla de ' +
    'eventos mal diseñada y el esquema completo de una biblioteca a partir de sus requisitos.',
  steps: [
    step(1, 'entities-relationships', 'Entidades y relaciones', 25, 1),
    step(2, 'normalization', 'Normalización práctica', 35, 1),
    step(3, 'modeling-patterns', 'Patrones de modelado', 25, 2),
    step(4, 'practice', 'Práctica final', 35, 2),
  ],
};
