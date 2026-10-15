import { TutorialManifest } from '../tutorial.model';

function comingSoon(
  number: number,
  slug: string,
  title: string,
  subtitle: string,
  level: TutorialManifest['level'],
  topics: string[],
): TutorialManifest {
  return {
    slug,
    number,
    title,
    subtitle,
    summary: subtitle,
    level,
    estimatedMinutes: 0,
    topics,
    status: 'coming-soon',
    steps: [],
  };
}

/** Planned syllabus. Each entry becomes its own manifest file once its content exists. */
export const COMING_SOON: readonly TutorialManifest[] = [
  // Part 1: general SQL
  comingSoon(8, 'tables-constraints', 'Tablas y restricciones', 'CREATE, ALTER y reglas que protegen tus datos', 'intermediate', [
    'CREATE TABLE',
    'ALTER TABLE',
    'Constraints',
    'ON DELETE',
  ]),
  comingSoon(9, 'data-modeling', 'Modelado de datos', 'Relaciones 1:N, N:M y normalización práctica', 'intermediate', [
    '1:N',
    'N:M',
    'Normalización',
  ]),
  comingSoon(10, 'transactions', 'Transacciones', 'Todo o nada: BEGIN, COMMIT y ROLLBACK', 'intermediate', [
    'BEGIN',
    'COMMIT',
    'ROLLBACK',
  ]),
  comingSoon(11, 'expressions-functions', 'Expresiones y funciones', 'CASE, COALESCE y funciones de texto y fecha', 'intermediate', [
    'CASE',
    'COALESCE',
    'Texto',
    'Fechas',
  ]),
  comingSoon(12, 'indexes-explain', 'Índices y EXPLAIN', 'Por qué una consulta es lenta y cómo arreglarla', 'intermediate', [
    'Índices',
    'EXPLAIN',
  ]),
  // Part 2: PostgreSQL
  comingSoon(13, 'postgres-types', 'Tipos de PostgreSQL', 'IDENTITY, UUID y timestamptz', 'advanced', [
    'PostgreSQL',
    'IDENTITY',
    'UUID',
    'timestamptz',
  ]),
  comingSoon(14, 'returning-upsert', 'RETURNING y UPSERT', 'Escribir y leer en un solo viaje, ON CONFLICT', 'advanced', [
    'PostgreSQL',
    'RETURNING',
    'ON CONFLICT',
  ]),
  comingSoon(15, 'parameters-sql-injection', 'Parámetros y SQL injection', 'La regla de seguridad más importante', 'advanced', [
    'PostgreSQL',
    '$1',
    'SQL injection',
  ]),
  comingSoon(16, 'window-functions', 'Window functions', 'Rankings, totales acumulados y comparaciones entre filas', 'advanced', [
    'PostgreSQL',
    'ROW_NUMBER',
    'RANK',
    'OVER',
  ]),
  comingSoon(17, 'jsonb', 'JSONB', 'Datos semiestructurados sin perder SQL', 'advanced', ['PostgreSQL', 'JSONB']),
  comingSoon(18, 'advanced-indexes', 'Índices avanzados', 'Compuestos, parciales y EXPLAIN ANALYZE', 'advanced', [
    'PostgreSQL',
    'Índices',
    'EXPLAIN ANALYZE',
  ]),
  comingSoon(19, 'views', 'Vistas', 'Consultas reutilizables con nombre propio', 'advanced', ['PostgreSQL', 'VIEW']),
  comingSoon(20, 'recursive-ctes', 'CTEs recursivas (opcional)', 'Árboles y jerarquías: categorías, comentarios', 'advanced', [
    'PostgreSQL',
    'WITH RECURSIVE',
    'Opcional',
  ]),
  comingSoon(21, 'triggers', 'Triggers (opcional)', 'Lógica que se ejecuta sola en la base', 'advanced', [
    'PostgreSQL',
    'Triggers',
    'Opcional',
  ]),
  comingSoon(22, 'plpgsql-functions', 'Funciones PL/pgSQL (opcional)', 'Programar dentro de PostgreSQL', 'advanced', [
    'PostgreSQL',
    'PL/pgSQL',
    'Opcional',
  ]),
  // Capstones
  comingSoon(23, 'capstone-ecommerce', 'Proyecto guiado: e-commerce', 'Diseña y consulta la base de una tienda real', 'project', [
    'Modelado',
    'Constraints',
    'Índices',
    'Reportes',
  ]),
  comingSoon(24, 'capstone-bookings', 'Proyecto: sistema de reservas', 'Disponibilidad, solapamientos y cancelaciones', 'project', [
    'Modelado',
    'Transacciones',
    'Constraints',
  ]),
  comingSoon(25, 'capstone-courses', 'Proyecto: plataforma de cursos', 'Inscripciones, progreso y certificados', 'project', [
    'Modelado',
    'Window functions',
    'JSONB',
  ]),
  comingSoon(26, 'capstone-saas', 'Proyecto: SaaS multi-tenant', 'Muchos clientes, una base, datos aislados', 'project', [
    'Multi-tenant',
    'Índices',
    'Seguridad',
  ]),
];
