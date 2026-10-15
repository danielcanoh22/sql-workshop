import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const MODIFYING_DATA: TutorialManifest = {
  slug: 'modifying-data',
  number: 7,
  title: 'Modificar datos',
  subtitle: 'INSERT, UPDATE y DELETE sin romper nada',
  summary:
    'Añade, cambia y borra filas de forma segura: INSERT con lista de columnas, INSERT ... SELECT, UPDATE con ' +
    'subconsultas, DELETE respetando las claves foráneas, borrado lógico y RETURNING.',
  level: 'intermediate',
  estimatedMinutes: 105,
  topics: ['INSERT', 'UPDATE', 'DELETE', 'RETURNING', 'Soft delete'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Las operaciones de escritura de la tienda: altas de productos y categorías, subidas de precios, reposición ' +
    'de stock, cancelación de pedidos abandonados, bajas lógicas y el registro de un pedido completo.',
  steps: [
    step(1, 'insert', 'Insertar filas con INSERT', 25, 3),
    step(2, 'update', 'Actualizar con UPDATE', 25, 4),
    step(3, 'delete', 'Borrar con DELETE (o no)', 25, 3),
    step(4, 'practice', 'Práctica final', 30, 3),
  ],
};
