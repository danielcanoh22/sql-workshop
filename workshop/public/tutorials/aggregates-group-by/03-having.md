## Objetivo del paso

Ya sabes calcular un resumen por grupo. Ahora quieres quedarte solo con **algunos grupos**: los países con al menos 4 clientes, los clientes con más de 3 pedidos. En este paso aprendes:

1. A filtrar grupos con `HAVING`.
2. La diferencia entre `WHERE` y `HAVING`, y cuándo usar cada uno.
3. El orden completo en que se evalúa una consulta.

## `WHERE` no puede filtrar por una agregación

La idea obvia no funciona:

```sql run error title="Una agregación en WHERE"
SELECT country, count(*) AS customers
FROM customers
WHERE count(*) >= 4
GROUP BY country;
```

`aggregate functions are not allowed in WHERE`. `WHERE` se evalúa fila a fila, **antes** de formar los grupos, así que en ese momento todavía no existe ningún `count(*)` que comparar.

## `HAVING`: el WHERE de los grupos

`HAVING` va después de `GROUP BY` y filtra **grupos**, cuando las agregaciones ya están calculadas:

```sql run title="Países con al menos 4 clientes"
SELECT country, count(*) AS customers
FROM customers
GROUP BY country
HAVING count(*) >= 4
ORDER BY country;
```

## `WHERE` y `HAVING` juntos

Se pueden usar a la vez, y cada uno hace su trabajo: `WHERE` elige las **filas** que entran en los grupos y `HAVING` elige los **grupos** que salen.

```sql run title="Clientes con al menos 4 pedidos no cancelados"
SELECT customer_id, count(*) AS orders
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id
HAVING count(*) >= 4
ORDER BY customer_id;
```

Primero se descartan los pedidos cancelados, después se cuentan los pedidos de cada cliente y, al final, se quedan los clientes con 4 o más.

:::tip Si no usa una agregación, va en WHERE
Una condición que no usa ninguna agregación (`status <> 'cancelled'`, `country = 'España'`) va en `WHERE`. `HAVING` es solo para condiciones sobre agregaciones (`count(*) >= 4`, `avg(price) > 50`). Así la consulta se lee mejor: quien la lee entiende enseguida qué filtra filas y qué filtra grupos.
:::

:::postgres El planificador te cubre las espaldas
Si escribes una condición sin agregaciones en `HAVING` (por ejemplo `HAVING status <> 'cancelled'`), PostgreSQL es lo bastante listo como para moverla al `WHERE` por su cuenta: el plan de ejecución es idéntico. Aun así, escríbela en `WHERE`: la intención queda clara y no dependes de que cada base de datos haga esa optimización.
:::

## El orden de evaluación completo

| Orden | Cláusula | Qué hace |
| --- | --- | --- |
| 1 | `FROM` | Elige la tabla (o, con JOINs, las tablas) |
| 2 | `WHERE` | Filtra **filas** |
| 3 | `GROUP BY` | Forma los grupos |
| 4 | `HAVING` | Filtra **grupos** |
| 5 | `SELECT` | Calcula las columnas del resultado |
| 6 | `ORDER BY` | Ordena |
| 7 | `LIMIT` / `OFFSET` | Corta |

Este orden explica casi todos los errores que verás: no puedes usar un agregado en `WHERE` (los grupos aún no existen), pero sí puedes usar el alias de una columna del `SELECT` en `ORDER BY` (ya se calculó).

## Retos

::::challenge Países con muchos clientes
Muestra los **países** con **al menos 4 clientes** y su **número de clientes**, ordenados por país.

:::solution
```sql ordered
SELECT country, count(*) AS customers
FROM customers
GROUP BY country
HAVING count(*) >= 4
ORDER BY country;
```
:::
::::

::::challenge Categorías caras
Muestra las categorías (`category_id`) cuyo **precio medio** es **mayor que 50**, con ese precio medio **redondeado a dos decimales**, ordenadas por `category_id`.

:::hint
La condición es sobre `avg(price)`, una agregación.
:::

:::solution
```sql ordered
SELECT category_id, round(avg(price), 2) AS average_price
FROM products
GROUP BY category_id
HAVING avg(price) > 50
ORDER BY category_id;
```
En `HAVING` se compara `avg(price)` sin redondear; el redondeo es solo para mostrarlo. Son Electrónica (1) y Deportes (4), las dos con algún producto muy caro.
:::
::::

::::challenge Ventas al por mayor
Muestra el **id de producto** y las **unidades vendidas** de los productos que han vendido **al menos 20 unidades**, contando solo las líneas de pedido con **más de una unidad** (`quantity > 1`). Ordena de más a menos unidades y, a igualdad, por id de producto.

:::hint
La condición sobre `quantity` es por fila (va en `WHERE`); la de las 20 unidades es sobre la suma (va en `HAVING`).
:::

:::solution
```sql ordered
SELECT product_id, sum(quantity) AS units
FROM order_items
WHERE quantity > 1
GROUP BY product_id
HAVING sum(quantity) >= 20
ORDER BY units DESC, product_id;
```
:::
::::

:::recap
- `HAVING` filtra **grupos** después de agregar; `WHERE` filtra **filas** antes de agrupar.
- Las agregaciones no se pueden usar en `WHERE`.
- Condiciones sin agregaciones van en `WHERE`; con agregaciones, en `HAVING`.
- Orden de evaluación: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`.

En el último paso construirás informes completos con todo lo que has aprendido.
:::
