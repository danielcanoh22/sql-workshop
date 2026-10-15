## Objetivo del paso

Cuando una consulta tiene subconsultas dentro de subconsultas, se lee de dentro hacia fuera y cuesta seguirla. Las **CTEs** (*Common Table Expressions*) permiten escribirla como una receta: primero calculo esto, después aquello, y al final respondo. En este paso aprendes:

1. A definir una CTE con `WITH` y usarla como si fuera una tabla.
2. A encadenar varias CTEs.
3. Qué hace PostgreSQL con una CTE por dentro.

## `WITH`: una subconsulta con nombre

¿Cuántos pedidos superan los 500 de importe? Primero hay que calcular el total de cada pedido, y después contar:

```sql run title="Pedidos de más de 500"
WITH order_totals AS (
  SELECT order_id, sum(quantity * unit_price) AS total
  FROM order_items
  GROUP BY order_id
)
SELECT count(*) AS big_orders
FROM order_totals
WHERE total > 500;
```

:::concept Cómo se lee una CTE
`WITH nombre AS (consulta)` define una tabla **temporal y con nombre** que solo existe durante esa consulta. Después de la definición viene la consulta principal, que usa `order_totals` como si fuera una tabla más.

La consulta se lee de arriba abajo: "calcula el total de cada pedido; después, cuenta los que pasan de 500".
:::

Una CTE puede usarse **varias veces** en la consulta principal. Aquí, para comparar cada pedido con la media de todos:

```sql run title="Pedidos por encima del total medio"
WITH order_totals AS (
  SELECT order_id, sum(quantity * unit_price) AS total
  FROM order_items
  GROUP BY order_id
)
SELECT order_id, total
FROM order_totals
WHERE total > (SELECT avg(total) FROM order_totals)
ORDER BY total DESC;
```

## Varias CTEs

Se separan con comas, y cada una puede usar las anteriores:

```sql run title="Gasto de cada cliente frente a la media"
WITH customer_spending AS (
  SELECT o.customer_id, sum(oi.quantity * oi.unit_price) AS spent
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
),
average AS (
  SELECT avg(spent) AS avg_spent
  FROM customer_spending
)
SELECT c.first_name, c.last_name, round(s.spent, 2) AS spent, round(a.avg_spent, 2) AS average
FROM customer_spending AS s
JOIN customers AS c ON c.id = s.customer_id
CROSS JOIN average AS a
WHERE s.spent > a.avg_spent
ORDER BY s.spent DESC;
```

`CROSS JOIN` combina cada fila con cada fila de la otra tabla, sin condición. Como `average` tiene una sola fila, simplemente añade la columna de la media a cada cliente.

:::postgres ¿Una CTE es más lenta?
En versiones antiguas de PostgreSQL (hasta la 11), una CTE se calculaba siempre por separado y actuaba como una barrera para el optimizador. Desde PostgreSQL 12, una CTE que se usa **una sola vez** se integra en la consulta principal y se optimiza junto a ella, como si fuera una subconsulta. Si se usa varias veces, se calcula una vez y se reutiliza. Puedes forzar cualquiera de los dos comportamientos con `AS MATERIALIZED` o `AS NOT MATERIALIZED`, aunque casi nunca hace falta.

Conclusión: usa CTEs para que tus consultas se entiendan; no cuestan rendimiento.
:::

## Retos

::::challenge Los pedidos grandes
Usando una CTE con el **total de cada pedido**, muestra el **id de pedido** y su **total** de los pedidos de **más de 500**, del mayor al menor (desempata por id de pedido).

:::hint
La CTE agrupa `order_items` por `order_id`. La consulta principal filtra y ordena.
:::

:::solution
```sql ordered
WITH order_totals AS (
  SELECT order_id, sum(quantity * unit_price) AS total
  FROM order_items
  GROUP BY order_id
)
SELECT order_id, total
FROM order_totals
WHERE total > 500
ORDER BY total DESC, order_id;
```
También podrías usar `HAVING sum(...) > 500` sin CTE. Las dos son correctas; la CTE gana cuando el resultado intermedio se va a reutilizar o la consulta sigue creciendo.
:::
::::

::::challenge Clientes por encima de la media
Muestra el **nombre**, el **apellido** y el **gasto** (redondeado a dos decimales) de los clientes que han gastado **más que la media de gasto por cliente**, sin contar pedidos cancelados. Ordena del que más gastó al que menos.

:::hint
Primero una CTE con el gasto de cada cliente (`customer_id` y su suma). Después, compara cada gasto con la media de esa misma CTE.
:::

:::hint
`WHERE s.spent > (SELECT avg(spent) FROM customer_spending)`.
:::

:::solution
```sql ordered
WITH customer_spending AS (
  SELECT o.customer_id, sum(oi.quantity * oi.unit_price) AS spent
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
)
SELECT c.first_name, c.last_name, round(s.spent, 2) AS spent
FROM customer_spending AS s
JOIN customers AS c ON c.id = s.customer_id
WHERE s.spent > (SELECT avg(spent) FROM customer_spending)
ORDER BY s.spent DESC;
```
:::
::::

::::challenge Más caros que su categoría
Muestra el **nombre**, el **precio** y la **categoría** (`category_id`) de los productos cuyo precio supera **la media de su categoría**. Esta vez usa una CTE con la media de cada categoría y únela a los productos. Ordena por categoría y precio.

:::hint
La CTE agrupa `products` por `category_id` y calcula `avg(price)`.
:::

:::solution
```sql ordered
WITH category_average AS (
  SELECT category_id, avg(price) AS avg_price
  FROM products
  GROUP BY category_id
)
SELECT p.name, p.price, p.category_id
FROM products AS p
JOIN category_average AS a ON a.category_id = p.category_id
WHERE p.price > a.avg_price
ORDER BY p.category_id, p.price;
```
Es el mismo resultado que la subconsulta correlacionada del primer paso, pero la media de cada categoría se calcula **una vez** en lugar de una vez por producto.
:::
::::

:::recap
- `WITH nombre AS (consulta)` define una tabla temporal con nombre para la consulta principal.
- Varias CTEs se separan con comas y cada una puede usar las anteriores.
- Una CTE se puede usar varias veces; las consultas se leen de arriba abajo.
- Desde PostgreSQL 12 las CTEs no penalizan el rendimiento: úsalas para la legibilidad.

En el último paso verás subconsultas en el `FROM`, resolverás "el último de cada grupo" y medirás cuánto cuesta una subconsulta correlacionada con miles de filas.
:::
