import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const RELATIONAL_MODEL: TutorialManifest = {
  slug: 'relational-model',
  number: 1,
  title: 'El modelo relacional',
  subtitle: 'Tablas, filas, claves y las reglas que protegen tus datos',
  summary:
    'Entiende cómo organiza los datos una base de datos relacional antes de consultarlos: tablas y tipos, ' +
    'claves primarias y foráneas, y las restricciones que impiden guardar datos incorrectos.',
  level: 'beginner',
  estimatedMinutes: 105,
  topics: ['Tablas', 'Tipos de datos', 'Primary key', 'Foreign key', 'Constraints'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Un mapa mental claro de la base de datos de la tienda: qué guarda cada tabla, cómo se relacionan y qué ' +
    'reglas hace cumplir PostgreSQL, comprobado ejecutando consultas y viendo cómo rechaza los datos incorrectos.',
  steps: [
    step(1, 'what-is-a-database', '¿Qué es una base de datos?', 15, 1),
    step(2, 'tables-and-types', 'Tablas y tipos de datos', 25, 1),
    step(3, 'primary-keys', 'Claves primarias', 20, 1),
    step(4, 'foreign-keys', 'Claves foráneas y relaciones', 25, 2),
    step(5, 'constraints', 'Restricciones', 20, 1),
  ],
};
