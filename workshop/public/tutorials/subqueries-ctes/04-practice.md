## Objetivo del paso

Cierras el tutorial con tres cosas que aparecen constantemente en aplicaciones reales:

1. Subconsultas en el `FROM` (tablas derivadas).
2. El patrón "la fila más reciente de cada grupo".
3. El coste de una subconsulta correlacionada cuando hay miles de filas.

## Subconsultas en el `FROM`

Una subconsulta en el `FROM` actúa como una tabla. ¿Cuántas líneas tiene, de media, un pedido? Primero cuentas las líneas de cada pedido y después haces la media de esos recuentos:

```sql run title="Líneas por pedido, de media"
SELECT round(avg(line_count), 2) AS average_lines
FROM (
  SELECT order_id, count(*) AS line_count
  FROM order_items
  GROUP BY order_id
) AS per_order;
```

A esto se le llama **tabla derivada**, y en PostgreSQL necesita un alias (`AS per_order`). Es lo mismo que una CTE escrita en otro sitio: usa la que se lea mejor. Con más de un nivel, las CTEs suelen ganar.

## El último de cada grupo

"El último pedido de cada cliente" es una pregunta clásica. No basta con `max(order_date)` agrupado por cliente si además quieres el **id** y el **estado** de ese pedido: `GROUP BY` solo te da columnas agrupadas o agregadas. Una subconsulta correlacionada lo resuelve:

```sql run title="El último pedido de cada cliente"
SELECT o.customer_id, o.id, o.order_date, o.status
FROM orders AS o
WHERE o.order_date = (
  SELECT max(o2.order_date)
  FROM orders AS o2
  WHERE o2.customer_id = o.customer_id
)
ORDER BY o.customer_id;
```

## El coste de las subconsultas correlacionadas

Una subconsulta correlacionada en el `SELECT` es muy cómoda, pero se ejecuta **una vez por fila**. Es el mismo problema que en una aplicación se llama **N+1** (una consulta para la lista y otra por cada elemento), solo que dentro de la base de datos.

:::compare Contar los pedidos de cada cliente de España
La comparación añade 20 000 clientes de España y 200 000 pedidos, y cuenta los pedidos de cada cliente español de dos formas.

```sql setup
INSERT INTO customers (id, first_name, last_name, email, country, signup_date)
SELECT 1000 + g, 'Cliente', 'Prueba ' || g, 'cliente' || g || '@example.com', 'España', DATE '2024-01-01'
FROM generate_series(1, 20000) AS g;
INSERT INTO orders (id, customer_id, order_date, status)
SELECT 1000 + g, 1001 + g % 20000, DATE '2025-01-01' + g % 365, 'delivered'
FROM generate_series(1, 200000) AS g;
ANALYZE customers;
ANALYZE orders;
```

```sql variant label="Subconsulta correlacionada"
SELECT c.id, c.first_name,
       (SELECT count(*) FROM orders AS o WHERE o.customer_id = c.id) AS orders
FROM customers AS c
WHERE c.country = 'España';
```
La subconsulta se ejecuta **una vez por cada uno de los 20 009 clientes**: 20 009 búsquedas en el índice de `orders.customer_id`. Cada búsqueda es rápida, pero juntas tocan cientos de miles de páginas.

```sql variant label="LEFT JOIN y GROUP BY" best
SELECT c.id, c.first_name, count(o.id) AS orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE c.country = 'España'
GROUP BY c.id, c.first_name;
```
PostgreSQL lee cada tabla **una sola vez**, empareja las filas con un *hash join* y cuenta por grupo. Cuando necesitas un resultado para muchas filas, piensa en **conjuntos** (un JOIN y un `GROUP BY`), no en un cálculo fila a fila.
:::

:::tip ¿Entonces nunca uso subconsultas correlacionadas?
Sí las usas: son perfectas para pocas filas (las 6 categorías del primer paso), para `EXISTS` (que PostgreSQL convierte en un semi-join) y para casos como "el último de cada grupo" cuando hay un índice adecuado. Lo que conviene evitar es una subconsulta correlacionada en el `SELECT` de una consulta que devuelve miles de filas.
:::

## Retos

::::challenge Productos por pedido
Muestra el **número máximo de líneas** que tiene un pedido, usando una subconsulta en el `FROM` que cuente las líneas de cada pedido.

:::hint
La subconsulta agrupa `order_items` por `order_id` y cuenta. La consulta de fuera calcula el máximo de esos recuentos.
:::

:::solution
```sql
SELECT max(line_count) AS max_lines
FROM (
  SELECT order_id, count(*) AS line_count
  FROM order_items
  GROUP BY order_id
) AS per_order;
```
:::
::::

::::challenge Clientes con más pedidos que la media
Muestra el **nombre**, el **apellido** y el **número de pedidos** de los clientes que tienen **más pedidos que la media** de pedidos por cliente (contando solo los clientes que tienen alguno). Ordena por id de cliente.

:::hint
Una CTE con `customer_id` y su número de pedidos. Después compara cada cliente con la media de esa CTE.
:::

:::solution
```sql ordered
WITH per_customer AS (
  SELECT customer_id, count(*) AS orders
  FROM orders
  GROUP BY customer_id
)
SELECT c.first_name, c.last_name, pc.orders
FROM per_customer AS pc
JOIN customers AS c ON c.id = pc.customer_id
WHERE pc.orders > (SELECT avg(orders) FROM per_customer)
ORDER BY c.id;
```
La media es de unos 3.2 pedidos por cliente: salen los que tienen 4.
:::
::::

::::challenge El pedido más caro de cada cliente
Muestra, para cada cliente con pedidos, el **id de cliente**, el **id** de su pedido de **mayor importe** y ese **importe**. Ordena por id de cliente y, a igualdad, por id de pedido.

:::hint
Primero una CTE con el importe de cada pedido **y su cliente** (une `orders` con `order_items` y agrupa por pedido).
:::

:::hint
Después, quédate con los pedidos cuyo importe es el máximo de los pedidos **de su mismo cliente**: una subconsulta correlacionada sobre la CTE.
:::

:::solution
```sql ordered
WITH order_totals AS (
  SELECT o.id, o.customer_id, sum(oi.quantity * oi.unit_price) AS total
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  GROUP BY o.id, o.customer_id
)
SELECT t.customer_id, t.id AS order_id, t.total
FROM order_totals AS t
WHERE t.total = (
  SELECT max(t2.total)
  FROM order_totals AS t2
  WHERE t2.customer_id = t.customer_id
)
ORDER BY t.customer_id, t.id;
```
Si un cliente tuviera dos pedidos con el mismo importe máximo, saldrían los dos: por eso el orden desempata por id de pedido. Combina una CTE (reutilizada dos veces) con una subconsulta correlacionada: el patrón "la fila con el máximo de su grupo" sobre un resultado calculado.
:::
::::

:::recap
En este tutorial has aprendido a usar consultas dentro de consultas:

- Subconsultas **escalares** (un valor) y **correlacionadas** (una vez por fila).
- `IN`, `EXISTS` y `NOT EXISTS` para preguntas de existencia; **`NOT EXISTS` en lugar de `NOT IN`** con subconsultas.
- **CTEs** con `WITH` para escribir consultas largas como una receta; no cuestan rendimiento desde PostgreSQL 12.
- **Tablas derivadas** en el `FROM` y el patrón "la fila con el máximo de su grupo".
- Para muchas filas, piensa en conjuntos: un JOIN y un `GROUP BY` leen cada tabla una vez; una subconsulta correlacionada en el `SELECT` se ejecuta por cada fila.

En el siguiente tutorial dejarás de solo leer: aprenderás a **modificar datos** con `INSERT`, `UPDATE` y `DELETE`.
:::
