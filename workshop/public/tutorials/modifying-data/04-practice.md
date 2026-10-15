## Objetivo del paso

Estos retos son tareas reales del día a día de una tienda: reponer stock, aplicar descuentos, registrar un pedido. Antes de modificar, piensa qué filas tocas y comprueba el `WHERE` con un `SELECT`.

## Registrar un pedido completo

Crear un pedido son **dos** inserciones: la fila en `orders` y sus líneas en `order_items`. El problema es que las líneas necesitan el `id` del pedido, que genera la base de datos. En PostgreSQL se puede hacer todo en **una sola sentencia** combinando una CTE con `RETURNING`:

```sql run title="Un pedido con dos líneas, en una sentencia"
WITH new_order AS (
  INSERT INTO orders (customer_id, order_date, status)
  VALUES (30, '2025-12-31', 'pending')
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT new_order.id, item.product_id, item.quantity, item.unit_price
FROM new_order
CROSS JOIN (VALUES (5, 2, 19.99), (8, 1, 9.95)) AS item(product_id, quantity, unit_price)
RETURNING order_id, product_id, quantity;
```

:::concept CTEs que modifican datos
La CTE `new_order` **inserta** el pedido y, gracias a `RETURNING id`, se puede usar como una tabla con el `id` recién creado. La consulta principal inserta las líneas usando ese `id`. `(VALUES ...) AS item(...)` es una pequeña tabla con las líneas del pedido, y `CROSS JOIN` combina el único pedido con cada línea.

Todo es **una sentencia**: o se guardan el pedido y sus líneas, o no se guarda nada. Es una extensión de PostgreSQL; en otras bases de datos harías dos sentencias dentro de una transacción.
:::

## Retos

::::challenge Reponer stock
El almacén repone **50 unidades** de cada producto **activo** con **menos de 20 unidades** en stock.

```sql verify
SELECT id, name, stock
FROM products;
```

:::hint
El nuevo valor se calcula a partir del actual: `stock = stock + 50`.
:::

:::solution
```sql
UPDATE products
SET stock = stock + 50
WHERE is_active AND stock < 20;
```
:::
::::

::::challenge Rebajas de Ropa
Aplica un **15 % de descuento** (precio por 0.85, **redondeado a dos decimales**) a los productos de la categoría llamada **Ropa**. Busca la categoría **por su nombre** con una subconsulta, no escribas su id.

```sql verify
SELECT id, name, price
FROM products;
```

:::hint
`WHERE category_id = (SELECT id FROM categories WHERE name = 'Ropa')`.
:::

:::solution
```sql
UPDATE products
SET price = round(price * 0.85, 2)
WHERE category_id = (SELECT id FROM categories WHERE name = 'Ropa');
```
Buscar por nombre hace la sentencia legible y no depende de qué `id` tenga la categoría en cada entorno (desarrollo, pruebas, producción). Como `name` es `UNIQUE`, la subconsulta devuelve como mucho una fila.
:::
::::

::::challenge Un pedido para Alba
Registra un pedido **pendiente** de la clienta **29** (Alba), con fecha **2025-12-31**, con una línea: **1** unidad del producto **12** (*Lámpara de escritorio*) a **29.90**. Hazlo en una sola sentencia.

```sql verify
SELECT o.customer_id, o.order_date, o.status, oi.product_id, oi.quantity, oi.unit_price
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.customer_id = 29;
```

:::hint
Usa el mismo patrón que el ejemplo de arriba: una CTE que inserta el pedido con `RETURNING id`.
:::

:::hint
Con una sola línea no necesitas `VALUES` ni `CROSS JOIN`: `SELECT id, 12, 1, 29.90 FROM new_order`.
:::

:::solution
```sql
WITH new_order AS (
  INSERT INTO orders (customer_id, order_date, status)
  VALUES (29, '2025-12-31', 'pending')
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT id, 12, 1, 29.90
FROM new_order;
```
:::
::::

## Modificar también puede ser lento

`UPDATE` y `DELETE` tienen que **encontrar** las filas antes de cambiarlas, así que las reglas de los filtros sargables valen igual. Dar de baja a un cliente buscado por email:

:::compare Dar de baja a un cliente por su email
La comparación añade 50 000 clientes y da de baja a uno de ellos. Cada variante se ejecuta en una transacción que se deshace, así que ninguna afecta a la otra.

```sql setup
INSERT INTO customers (id, first_name, last_name, email, country, signup_date)
SELECT 1000 + g, 'Cliente', 'Prueba ' || g, 'cliente' || g || '@example.com', 'España', DATE '2024-01-01'
FROM generate_series(1, 50000) AS g;
ANALYZE customers;
```

```sql variant label="Función sobre la columna"
UPDATE customers
SET is_active = false
WHERE lower(email) = 'cliente4242@example.com'
RETURNING id;
```
Para encontrar la fila, PostgreSQL calcula `lower(email)` en las 50 030 filas: el índice único de `email` no sirve. El `UPDATE` cambia una sola fila, pero antes lee la tabla entera.

```sql variant label="Comparación directa" best
UPDATE customers
SET is_active = false
WHERE email = 'cliente4242@example.com'
RETURNING id;
```
Con la columna "desnuda", el índice lleva directamente a la fila. Lo mismo que aprendiste para `SELECT`: el `WHERE` de un `UPDATE` o un `DELETE` se escribe con las mismas reglas.
:::

:::recap
En este tutorial has aprendido a modificar datos de forma segura:

- `INSERT` con **lista de columnas**, varias filas a la vez, `RETURNING` e `INSERT ... SELECT`.
- `UPDATE ... SET ... WHERE`, con valores calculados y filas elegidas con subconsultas.
- `DELETE ... WHERE`, respetando las claves foráneas (primero las hijas), y el **borrado lógico** como alternativa.
- **Nunca `UPDATE` ni `DELETE` sin `WHERE`**: primero un `SELECT` con el mismo filtro.
- En PostgreSQL, una CTE con `RETURNING` registra un pedido y sus líneas en una sola sentencia.
- Los `WHERE` de `UPDATE` y `DELETE` también deben ser sargables.

En el siguiente tutorial crearás tus propias tablas con `CREATE TABLE` y las protegerás con restricciones.
:::
