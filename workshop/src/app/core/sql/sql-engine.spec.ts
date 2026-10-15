// @vitest-environment node
import { SqlEngine } from './sql-engine';
import { createNodeDatabase } from './testing/node-database';

const SEED = `
CREATE TABLE customers (
  id integer PRIMARY KEY,
  name text NOT NULL,
  city text,
  signed_up_on date NOT NULL
);
CREATE TABLE orders (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id),
  total numeric(10, 2) NOT NULL
);
INSERT INTO customers VALUES
  (1, 'Ana', 'Madrid', '2024-01-10'),
  (2, 'Luis', NULL, '2024-03-05'),
  (3, 'Marta', 'Bogotá', '2024-06-20');
INSERT INTO orders VALUES (10, 1, 25.50), (11, 1, 10.00), (12, 3, 99.90);
`;

describe('SqlEngine (real PGlite)', { timeout: 120_000 }, () => {
  let engine: SqlEngine;

  beforeAll(async () => {
    engine = new SqlEngine(createNodeDatabase);
    await engine.load('shop', SEED);
  }, 60_000);

  afterAll(() => engine.dispose());

  beforeEach(() => engine.reset(), 30_000);

  describe('run', () => {
    it('returns positional rows, keeping duplicated column names and raw date text', async () => {
      const outcome = await engine.run(
        'SELECT c.id, o.id, c.signed_up_on FROM customers c JOIN orders o ON o.customer_id = c.id ORDER BY o.id',
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      const [result] = outcome.results;
      expect(result.command).toBe('SELECT');
      expect(result.columns.map((c) => c.name)).toEqual(['id', 'id', 'signed_up_on']);
      expect(result.rows).toEqual([
        [1, 10, '2024-01-10'],
        [1, 11, '2024-01-10'],
        [3, 12, '2024-06-20'],
      ]);
      expect(result.rowCount).toBe(3);
    });

    it('returns one result per statement with its command tag and row count', async () => {
      const outcome = await engine.run("UPDATE customers SET city = 'Lima' WHERE id = 2; SELECT city FROM customers WHERE id = 2");

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.results.map((r) => r.command)).toEqual(['UPDATE', 'SELECT']);
      expect(outcome.results[0].rowCount).toBe(1);
      expect(outcome.results[1].rows).toEqual([['Lima']]);
    });

    it('reports errors with SQLSTATE, position and hint', async () => {
      const outcome = await engine.run('SELECT nam FROM customers');

      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.error.code).toBe('42703');
      expect(outcome.error.position).toBe(8);
      expect(outcome.error.hint).toContain('name');
    });

    it('keeps playground changes between runs until reset', async () => {
      await engine.run('DELETE FROM orders');
      const afterDelete = await engine.run('SELECT count(*) FROM orders');
      await engine.reset();
      const afterReset = await engine.run('SELECT count(*) FROM orders');

      expect(afterDelete.ok && afterDelete.results[0].rows).toEqual([[0]]);
      expect(afterReset.ok && afterReset.results[0].rows).toEqual([[3]]);
    });
  });

  describe('transactions in the playground', () => {
    it('reports whether a transaction was left open, failed or finished', async () => {
      const open = await engine.run("BEGIN; UPDATE customers SET city = 'Lima' WHERE id = 1");
      const failed = await engine.run('UPDATE orders SET customer_id = 999 WHERE id = 10');
      const stillFailed = await engine.run('SELECT 1');
      const rolledBack = await engine.run('ROLLBACK');

      expect(open.transaction).toBe('open');
      expect(failed.transaction).toBe('failed');
      expect(!stillFailed.ok && stillFailed.error.code).toBe('25P02');
      expect(rolledBack.transaction).toBe('idle');
    });

    it('keeps uncommitted changes visible inside the transaction and drops them on ROLLBACK', async () => {
      await engine.run("BEGIN; UPDATE customers SET city = 'Lima' WHERE id = 1");
      const inside = await engine.run('SELECT city FROM customers WHERE id = 1');
      await engine.run('ROLLBACK');
      const after = await engine.run('SELECT city FROM customers WHERE id = 1');

      expect(inside.ok && inside.results[0].rows).toEqual([['Lima']]);
      expect(after.ok && after.results[0].rows).toEqual([['Madrid']]);
    });

    it('treats an answer that leaves its transaction open as an error', async () => {
      const spec = {
        solutionSql: "BEGIN; UPDATE customers SET city = 'Lima' WHERE id = 1; COMMIT;",
        verifySql: 'SELECT id, city FROM customers ORDER BY id',
      };

      const outcome = await engine.check("BEGIN; UPDATE customers SET city = 'Lima' WHERE id = 1;", spec);
      const committed = await engine.check("BEGIN; UPDATE customers SET city = 'Lima' WHERE id = 1; COMMIT;", spec);

      expect(outcome.verdict).toBe('user-error');
      expect(outcome.userError?.message).toContain('COMMIT');
      expect(committed.verdict).toBe('correct');
    });
  });

  describe('load', () => {
    it('keeps the playground state when the same dataset is loaded again', async () => {
      await engine.run('DELETE FROM orders');
      await engine.load('shop', SEED);
      const outcome = await engine.run('SELECT count(*) FROM orders');

      expect(outcome.ok && outcome.results[0].rows).toEqual([[0]]);
    });
  });

  describe('schema and preview', () => {
    it('describes tables, columns, keys and row counts', async () => {
      const { tables } = await engine.schema();

      expect(tables.map((t) => [t.name, t.rowCount])).toEqual([
        ['customers', 3],
        ['orders', 3],
      ]);
      const orders = tables.find((t) => t.name === 'orders')!;
      expect(orders.columns).toEqual([
        { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
        {
          name: 'customer_id',
          type: 'integer',
          nullable: false,
          isPrimaryKey: false,
          references: { table: 'customers', column: 'id' },
        },
        { name: 'total', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false },
      ]);
    });

    it('previews a known table and refuses unknown names', async () => {
      const preview = await engine.preview('customers');
      const unknown = await engine.preview('customers; DROP TABLE orders');

      expect(preview.ok && preview.results[0].rows.length).toBe(3);
      expect(unknown.ok).toBe(false);
      expect((await engine.schema()).tables).toHaveLength(2);
    });
  });

  describe('check', () => {
    const spec = { solutionSql: "SELECT name FROM customers WHERE city IS NOT NULL ORDER BY name", ordered: true };

    it('accepts a different query that returns the same rows', async () => {
      const outcome = await engine.check('SELECT c.name AS customer FROM customers AS c WHERE c.city <> \'\' ORDER BY 1', spec);

      expect(outcome.verdict).toBe('correct');
    });

    it('ignores what the learner changed in the playground', async () => {
      await engine.run('DELETE FROM orders; DELETE FROM customers');
      const outcome = await engine.check('SELECT name FROM customers WHERE city IS NOT NULL ORDER BY name', spec);

      expect(outcome.verdict).toBe('correct');
    });

    it('explains a wrong row order, a wrong row count and a SQL error', async () => {
      const order = await engine.check('SELECT name FROM customers WHERE city IS NOT NULL ORDER BY name DESC', spec);
      const count = await engine.check('SELECT name FROM customers ORDER BY name', spec);
      const error = await engine.check('SELEC name FROM customers', spec);

      expect(order.verdict).toBe('row-order');
      expect(count.verdict).toBe('row-count');
      expect(count.message).toBe('Tu consulta devuelve 3 filas y se esperaban 2.');
      expect(error.verdict).toBe('user-error');
      expect(error.userError?.code).toBe('42601');
    });

    it('compares the state left by data-changing answers through the verify query', async () => {
      const dml = {
        solutionSql: "UPDATE customers SET city = 'Sin ciudad' WHERE city IS NULL",
        verifySql: 'SELECT id, city FROM customers ORDER BY id',
      };

      const right = await engine.check("UPDATE customers SET city = 'Sin ciudad' WHERE id = 2", dml);
      const wrong = await engine.check("UPDATE customers SET city = 'Sin ciudad'", dml);

      expect(right.verdict).toBe('correct');
      expect(wrong.verdict).toBe('values');
    });

    it('words the feedback of data-changing answers around the verification, not the answer', async () => {
      // Customer 1 has orders 10 and 11 in this spec's seed.
      const dml = {
        solutionSql: 'DELETE FROM orders WHERE id = 11',
        verifySql: 'SELECT id FROM orders WHERE customer_id = 1',
      };

      const wrong = await engine.check('SELECT 1', dml);

      expect(wrong.verdict).toBe('row-count');
      expect(wrong.message).toBe(
        'Después de ejecutar tu SQL, los datos no quedan como se esperaba: la comprobación devuelve 2 filas y se esperaban 1.',
      );
    });

    it('reports answers that return no rows at all', async () => {
      const outcome = await engine.check("UPDATE customers SET city = 'X' WHERE id = 99", spec);

      expect(outcome.verdict).toBe('no-result');
    });
  });

  describe('compare', () => {
    it('explains each variant on the same data and isolates variant setups', async () => {
      const outcome = await engine.compare(
        [
          { id: 'function', sql: "SELECT id FROM customers WHERE lower(name) = 'ana'" },
          { id: 'indexed', setupSql: 'CREATE INDEX customers_name_idx ON customers (name)', sql: "SELECT id FROM customers WHERE name = 'Ana'" },
          { id: 'other', sql: "SELECT id FROM customers WHERE name = 'Luis'" },
        ],
        'INSERT INTO customers SELECT g, \'user\' || g, NULL, DATE \'2024-01-01\' FROM generate_series(100, 5000) AS g; ANALYZE customers',
      );

      const [fn, indexed, other] = outcome.variants;
      expect(fn.sameResultAsFirst).toBe(true);
      expect(indexed.sameResultAsFirst).toBe(true);
      expect(other.sameResultAsFirst).toBe(false);
      expect(fn.plan?.scanTypes).toEqual(['Seq Scan']);
      expect(fn.plan?.rowsScanned).toBeGreaterThan(4000);
      expect(indexed.plan?.scanTypes.some((t) => t.startsWith('Index') || t.startsWith('Bitmap'))).toBe(true);
      expect(indexed.plan!.rowsScanned).toBeLessThan(10);
      expect(indexed.plan!.pagesRead).toBeLessThan(fn.plan!.pagesRead);
      // The index of the second variant was rolled back, so the third one scans the table again.
      expect(other.plan?.scanTypes).toEqual(['Seq Scan']);
    });
  });
});
