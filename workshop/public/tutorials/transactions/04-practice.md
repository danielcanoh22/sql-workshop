## Objetivo del paso

Dos operaciones reales de la tienda, cada una con varias escrituras que tienen que ir juntas. Antes de escribir, piensa: ¿qué pasaría si se aplicara solo la mitad?

## Retos

::::challenge Cancelar un pedido y reponer el stock
El cliente cancela el **pedido 2**. En **una transacción**, marca el pedido como `'cancelled'` y **devuelve al stock** las unidades de cada una de sus líneas.

```sql verify
SELECT 'pedido 2' AS item, status AS detail
FROM orders
WHERE id = 2
UNION ALL
SELECT 'stock de ' || name, stock::text
FROM products
WHERE id IN (1, 7, 18);
```

:::hint
Dos sentencias dentro de `BEGIN` / `COMMIT`: un `UPDATE` de `orders` y un `UPDATE` de `products` que suma a cada producto la cantidad de su línea en el pedido 2.
:::

:::hint
En PostgreSQL, `UPDATE products AS p SET stock = p.stock + oi.quantity FROM order_items AS oi WHERE oi.order_id = 2 AND oi.product_id = p.id` une cada producto con su línea.
:::

:::solution
```sql
BEGIN;

UPDATE orders
SET status = 'cancelled'
WHERE id = 2;

UPDATE products AS p
SET stock = p.stock + oi.quantity
FROM order_items AS oi
WHERE oi.order_id = 2 AND oi.product_id = p.id;

COMMIT;
```
Sin la transacción, un fallo entre los dos `UPDATE` dejaría un pedido cancelado cuyo stock nunca volvió al almacén.
:::
::::

::::challenge Un pedido con control de stock
Registra en **una transacción** un pedido **pendiente** de la clienta **3**, con fecha **2025-12-31**, con dos líneas: **2** unidades del producto **1** a **59.90** y **1** unidad del producto **5** a **19.99**. Descuenta el stock de ambos productos con una actualización **atómica** (que no descuente si no hay suficiente).

```sql verify
SELECT 'línea ' || oi.product_id AS item, oi.quantity || ' a ' || oi.unit_price AS detail
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
WHERE o.customer_id = 3 AND o.order_date = '2025-12-31'
UNION ALL
SELECT 'stock de ' || name, stock::text
FROM products
WHERE id IN (1, 5);
```

:::hint
El pedido y sus dos líneas se insertan con una CTE con `RETURNING id` y `CROSS JOIN (VALUES ...)`, como en **Modificar datos**.
:::

:::hint
El stock de cada producto baja en una cantidad distinta. Puedes hacer dos `UPDATE` (uno por producto, cada uno con `AND stock >= cantidad`) o uno solo que use `CASE`, que verás en el siguiente tutorial.
:::

:::solution
```sql
BEGIN;

WITH new_order AS (
  INSERT INTO orders (customer_id, order_date, status)
  VALUES (3, '2025-12-31', 'pending')
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT new_order.id, item.product_id, item.quantity, item.unit_price
FROM new_order
CROSS JOIN (VALUES (1, 2, 59.90), (5, 1, 19.99)) AS item(product_id, quantity, unit_price);

UPDATE products
SET stock = stock - 2
WHERE id = 1 AND stock >= 2;

UPDATE products
SET stock = stock - 1
WHERE id = 5 AND stock >= 1;

COMMIT;
```
En una aplicación, después de cada `UPDATE` comprobarías cuántas filas cambió: si alguno devuelve 0, no había stock suficiente, y la aplicación haría `ROLLBACK` para no registrar un pedido que no se puede servir.
:::
::::

:::recap
En este tutorial has aprendido a proteger las operaciones de varias escrituras:

- `BEGIN` / `COMMIT` / `ROLLBACK`: todo o nada.
- Un error deja la transacción abortada hasta el `ROLLBACK`; `SAVEPOINT` permite deshacer solo una parte.
- Las actualizaciones **atómicas** con condición y `SELECT ... FOR UPDATE` evitan las actualizaciones perdidas.
- Transacciones **cortas**: bloquean lo que tocan.
- Las restricciones son la última red de seguridad, pase lo que pase en la aplicación.

En el siguiente tutorial aprenderás a transformar datos en la propia consulta: `CASE`, `COALESCE` y funciones de texto y fecha.
:::
