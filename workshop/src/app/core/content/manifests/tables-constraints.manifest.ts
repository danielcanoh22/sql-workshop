import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const TABLES_CONSTRAINTS: TutorialManifest = {
  slug: 'tables-constraints',
  number: 8,
  title: 'Tablas y restricciones',
  subtitle: 'CREATE, ALTER y reglas que protegen tus datos',
  summary:
    'Crea tus propias tablas y tradúcelas en reglas: claves generadas, valores por defecto, UNIQUE, CHECK, claves ' +
    'foráneas con ON DELETE, cambios con ALTER TABLE sobre datos existentes y migraciones.',
  level: 'intermediate',
  estimatedMinutes: 110,
  topics: ['CREATE TABLE', 'ALTER TABLE', 'Constraints', 'ON DELETE', 'Migraciones'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Las tablas nuevas de la tienda con todas sus reglas: proveedores, etiquetas, reseñas, listas de deseos y ' +
    'cupones de descuento enlazados con los pedidos, comprobadas por su comportamiento.',
  steps: [
    step(1, 'create-table', 'Crear tablas', 25, 2),
    step(2, 'constraints', 'Restricciones y claves foráneas', 30, 2),
    step(3, 'alter-table', 'Modificar tablas con ALTER TABLE', 25, 3),
    step(4, 'practice', 'Práctica final', 30, 2),
  ],
};
