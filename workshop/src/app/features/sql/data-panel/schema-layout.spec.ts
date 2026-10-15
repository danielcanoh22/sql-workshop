import { SchemaTable } from '../../../core/sql/sql.model';
import { BOX_WIDTH, layoutSchema } from './schema-layout';

const col = (name: string, extra: Partial<SchemaTable['columns'][number]> = {}) => ({
  name,
  type: 'integer',
  nullable: false,
  isPrimaryKey: false,
  ...extra,
});

const TABLES: SchemaTable[] = [
  {
    name: 'order_items',
    rowCount: 0,
    columns: [
      col('order_id', { isPrimaryKey: true, references: { table: 'orders', column: 'id' } }),
      col('product_id', { isPrimaryKey: true, references: { table: 'products', column: 'id' } }),
    ],
  },
  { name: 'customers', rowCount: 0, columns: [col('id', { isPrimaryKey: true }), col('name', { type: 'text' })] },
  {
    name: 'orders',
    rowCount: 0,
    columns: [col('id', { isPrimaryKey: true }), col('customer_id', { references: { table: 'customers', column: 'id' } })],
  },
  { name: 'products', rowCount: 0, columns: [col('id', { isPrimaryKey: true })] },
];

describe('layoutSchema', () => {
  it('places referenced tables to the left of the tables that point to them', () => {
    const { boxes } = layoutSchema(TABLES);
    const x = (name: string) => boxes.find((b) => b.table === name)!.x;

    expect(x('customers')).toBe(x('products'));
    expect(x('orders')).toBeGreaterThan(x('customers'));
    expect(x('order_items')).toBeGreaterThan(x('orders'));
  });

  it('stacks tables of the same column without overlapping, sorted by name', () => {
    const { boxes } = layoutSchema(TABLES);
    const [first, second] = boxes.filter((b) => b.x === 0);

    expect([first.table, second.table]).toEqual(['customers', 'products']);
    expect(second.y).toBeGreaterThan(first.y + first.height);
  });

  it('orders each column by the position of its parents so foreign key lines do not cross', () => {
    const tables: SchemaTable[] = [
      { name: 'categories', rowCount: 0, columns: [col('id', { isPrimaryKey: true })] },
      { name: 'customers', rowCount: 0, columns: [col('id', { isPrimaryKey: true })] },
      { name: 'orders', rowCount: 0, columns: [col('customer_id', { references: { table: 'customers', column: 'id' } })] },
      { name: 'products', rowCount: 0, columns: [col('category_id', { references: { table: 'categories', column: 'id' } })] },
    ];
    const { boxes } = layoutSchema(tables);
    const y = (name: string) => boxes.find((b) => b.table === name)!.y;

    expect(y('categories')).toBeLessThan(y('customers'));
    expect(y('products')).toBeLessThan(y('orders'));
  });

  it('draws one edge per foreign key, from the referencing column to the referenced column', () => {
    const { edges, boxes } = layoutSchema(TABLES);
    const orders = boxes.find((b) => b.table === 'orders')!;
    const customers = boxes.find((b) => b.table === 'customers')!;
    const edge = edges.find((e) => e.label === 'orders.customer_id → customers.id')!;

    expect(edges).toHaveLength(3);
    expect(edge.from).toEqual({ x: orders.x, y: orders.columns[1].y });
    expect(edge.to).toEqual({ x: customers.x + BOX_WIDTH, y: customers.columns[0].y });
  });

  it('sizes the canvas to contain every box', () => {
    const { width, height, boxes } = layoutSchema(TABLES);

    for (const box of boxes) {
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
  });

  it('survives self references and reference cycles', () => {
    const cyclic: SchemaTable[] = [
      { name: 'a', rowCount: 0, columns: [col('b_id', { references: { table: 'b', column: 'id' } })] },
      { name: 'b', rowCount: 0, columns: [col('a_id', { references: { table: 'a', column: 'id' } })] },
      { name: 'employees', rowCount: 0, columns: [col('manager_id', { references: { table: 'employees', column: 'id' } })] },
    ];

    expect(layoutSchema(cyclic).boxes).toHaveLength(3);
  });

  it('returns an empty canvas when there are no tables', () => {
    expect(layoutSchema([])).toEqual({ width: 0, height: 0, boxes: [], edges: [] });
  });
});
