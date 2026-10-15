import { TutorialManifest, TutorialStep } from '../tutorial.model';

function step(number: number, id: string, title: string, estimatedMinutes: number, challenges: number): TutorialStep {
  const prefix = String(number).padStart(2, '0');
  return { id, title, file: `${prefix}-${id}.md`, estimatedMinutes, challenges };
}

export const TRANSACTIONS: TutorialManifest = {
  slug: 'transactions',
  number: 10,
  title: 'Transacciones',
  subtitle: 'Todo o nada: BEGIN, COMMIT y ROLLBACK',
  summary:
    'Agrupa varias escrituras en una unidad que se aplica entera o no se aplica, recupérate de los errores con ' +
    'ROLLBACK y SAVEPOINT, y evita las actualizaciones perdidas cuando muchos usuarios compran a la vez.',
  level: 'intermediate',
  estimatedMinutes: 100,
  topics: ['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'Concurrencia'],
  status: 'available',
  dataset: 'store',
  whatYouWillBuild:
    'Las operaciones críticas de la tienda hechas de forma segura: registrar una venta, cancelar un pedido ' +
    'devolviendo el stock y vender solo cuando queda stock, aunque dos clientes compren a la vez.',
  steps: [
    step(1, 'begin-commit-rollback', 'BEGIN, COMMIT y ROLLBACK', 25, 1),
    step(2, 'errors-savepoints', 'Errores y SAVEPOINT', 25, 0),
    step(3, 'concurrency', 'Concurrencia', 25, 1),
    step(4, 'practice', 'Práctica final', 25, 2),
  ],
};
