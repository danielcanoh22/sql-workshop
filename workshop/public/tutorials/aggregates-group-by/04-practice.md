## Objetivo del paso

Estos retos son informes típicos de un panel de administración. En cada uno piensa en el orden de evaluación: qué filas entran (`WHERE`), cómo se agrupan (`GROUP BY`), qué grupos se quedan (`HAVING`) y cómo se presentan (`ORDER BY`, `LIMIT`).

## Agrupar por una expresión

Se puede agrupar por el resultado de una expresión, no solo por una columna. `EXTRACT(MONTH FROM order_date)` saca el número de mes de una fecha:

```sql run title="Pedidos por mes"
SELECT EXTRACT(MONTH FROM order_date) AS month, count(*) AS orders
FROM orders
GROUP BY month
ORDER BY month;
```

PostgreSQL permite usar el alias `month` en el `GROUP BY`. En el `WHERE` evitarías aplicar `EXTRACT` a la columna (no podría usar un índice, como viste en **SELECT y WHERE**), pero en el `SELECT` y el `GROUP BY` de un informe es perfectamente normal.

## Retos

::::challenge Los productos más vendidos
Muestra el **id** de los **5 productos con más unidades vendidas** y esas **unidades**, de más a menos. A igualdad de unidades, ordena por id de producto.

:::hint
Agrupa `order_items` por `product_id` y suma `quantity`.
:::

:::solution
```sql ordered
SELECT product_id, sum(quantity) AS units
FROM order_items
GROUP BY product_id
ORDER BY units DESC, product_id
LIMIT 5;
```
El más vendido es el producto 10, *Rayuela*… que tiene el stock a 0. En el tutorial de JOINs verás los nombres directamente en el resultado.
:::
::::

::::challenge Clientes distintos por estado
Para cada **estado** de pedido, muestra **cuántos clientes distintos** tienen algún pedido en ese estado, ordenado por estado.

:::hint
Un cliente puede tener varios pedidos en el mismo estado: no cuentes pedidos, cuenta clientes **distintos**.
:::

:::solution
```sql ordered
SELECT status, count(DISTINCT customer_id) AS customers
FROM orders
GROUP BY status
ORDER BY status;
```
Compara con `count(*)`: en `delivered` hay 27 pedidos pero solo 21 clientes distintos.
:::
::::

::::challenge Clientes inactivos por país
Muestra los **países** que tienen **clientes inactivos** y **cuántos** tiene cada uno, ordenados por país.

:::hint
Primero quédate con los clientes inactivos (`WHERE`) y después agrupa.
:::

:::solution
```sql ordered
SELECT country, count(*) AS inactive_customers
FROM customers
WHERE NOT is_active
GROUP BY country
ORDER BY country;
```
Filtrar en `WHERE` antes de agrupar hace que los países sin clientes inactivos ni siquiera formen un grupo.
:::
::::

::::challenge Meses con muchos pedidos
Muestra los **meses** (número de mes) con **8 o más pedidos** no cancelados y **cuántos** tuvo cada uno, ordenados por mes.

:::hint
Combina las tres cosas: `WHERE` para los cancelados, `GROUP BY` por el mes y `HAVING` para quedarte con los meses con 8 o más.
:::

:::solution
```sql ordered
SELECT EXTRACT(MONTH FROM order_date) AS month, count(*) AS orders
FROM orders
WHERE status <> 'cancelled'
GROUP BY month
HAVING count(*) >= 8
ORDER BY month;
```
:::
::::

:::recap
En este tutorial has aprendido a resumir datos:

- `count`, `sum`, `avg`, `min` y `max` resumen muchas filas en un valor, ignorando los `NULL`.
- `count(*)`, `count(columna)` y `count(DISTINCT columna)` cuentan cosas distintas.
- `GROUP BY` calcula un resumen por grupo; cada columna del `SELECT` está agrupada o agregada.
- `WHERE` filtra filas antes de agrupar; `HAVING` filtra grupos después.
- El orden de evaluación: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`.

En el siguiente tutorial, **JOINs**, por fin podrás mostrar nombres en lugar de ids: unirás tablas.
:::
