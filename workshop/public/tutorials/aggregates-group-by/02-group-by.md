## Objetivo del paso

"¿Cuántos clientes tenemos?" es una pregunta. "¿Cuántos clientes tenemos **en cada país**?" son nueve. `GROUP BY` las responde todas de una vez. En este paso aprendes:

1. A agrupar filas y calcular un resumen por grupo.
2. La regla de oro de `GROUP BY` (y el error que aparece si no la cumples).
3. A agrupar por varias columnas y a ordenar por el resultado de una agregación.

## `GROUP BY`

```sql run title="Clientes por país"
SELECT country, count(*) AS customers
FROM customers
GROUP BY country;
```

:::concept Qué hace GROUP BY
`GROUP BY country` reparte las filas en **grupos**, uno por cada valor distinto de `country`. Después, las funciones de agregación se calculan **dentro de cada grupo**. El resultado tiene **una fila por grupo**: 9 países, 9 filas.
:::

Para que el listado sea útil, ordénalo. Puedes ordenar por la agregación, usando su alias:

```sql run title="Los países con más clientes primero"
SELECT country, count(*) AS customers
FROM customers
GROUP BY country
ORDER BY customers DESC, country;
```

El `country` final desempata: Colombia y México tienen 5 clientes cada uno, y sin él su orden no estaría garantizado.

## La regla de oro

Intenta mostrar también el nombre de cada cliente:

```sql run error title="Una columna que no está agrupada"
SELECT country, first_name, count(*)
FROM customers
GROUP BY country;
```

`column "customers.first_name" must appear in the GROUP BY clause or be used in an aggregate function`. Tiene todo el sentido: el grupo de España tiene 9 clientes, así que **¿qué `first_name` debería mostrar en su única fila?** No hay respuesta.

:::tip La regla de oro de GROUP BY
Cada columna del `SELECT` tiene que estar en el `GROUP BY` **o** dentro de una función de agregación. Las columnas agrupadas tienen un único valor por grupo; las demás solo se pueden resumir.
:::

## Varias agregaciones y varias columnas

Puedes calcular varios resúmenes por grupo:

```sql run title="Productos por categoría"
SELECT category_id,
       count(*) AS products,
       min(price) AS cheapest,
       max(price) AS most_expensive,
       round(avg(price), 2) AS average_price
FROM products
GROUP BY category_id
ORDER BY category_id;
```

Y agrupar por varias columnas: se forma un grupo por cada **combinación** de valores.

```sql run title="Clientes activos e inactivos por país"
SELECT country, is_active, count(*) AS customers
FROM customers
GROUP BY country, is_active
ORDER BY country, is_active;
```

## Agrupar por una clave para obtener totales

En `order_items` cada pedido ocupa varias filas, una por producto. Agrupando por `order_id` obtienes **el importe total de cada pedido**:

```sql run title="Importe de cada pedido"
SELECT order_id, sum(quantity * unit_price) AS total
FROM order_items
GROUP BY order_id
ORDER BY order_id;
```

## Retos

::::challenge Pedidos por estado
Muestra cada **estado** de pedido y **cuántos pedidos** hay en él, de mayor a menor número de pedidos. Si dos estados tienen los mismos pedidos, ordénalos por nombre de estado.

:::hint
Agrupa por `status` y ordena por el recuento descendente y después por `status`.
:::

:::solution
```sql ordered
SELECT status, count(*) AS orders
FROM orders
GROUP BY status
ORDER BY orders DESC, status;
```
Hay tres estados empatados con 18 pedidos: sin el desempate por `status`, su orden podría cambiar entre ejecuciones.
:::
::::

::::challenge Precio medio por categoría
Muestra para cada categoría (`category_id`) el **número de productos** y su **precio medio redondeado a dos decimales**, ordenado por `category_id`.

:::solution
```sql ordered
SELECT category_id, count(*) AS products, round(avg(price), 2) AS average_price
FROM products
GROUP BY category_id
ORDER BY category_id;
```
:::
::::

::::challenge Los 5 pedidos más grandes
Muestra el **id de pedido** y su **importe total** (suma de cantidad por precio unitario de sus líneas) de los **5 pedidos de mayor importe**, del mayor al menor. Desempata por id de pedido.

:::hint
Agrupa `order_items` por `order_id`, ordena por el total descendente y corta con `LIMIT`.
:::

:::solution
```sql ordered
SELECT order_id, sum(quantity * unit_price) AS total
FROM order_items
GROUP BY order_id
ORDER BY total DESC, order_id
LIMIT 5;
```
`ORDER BY` y `LIMIT` se aplican **después** de agrupar: primero se calcula el total de cada pedido, después se ordenan los pedidos y se cortan los 5 primeros.
:::
::::

:::recap
- `GROUP BY` reparte las filas en grupos y las agregaciones se calculan **dentro de cada grupo**: una fila de resultado por grupo.
- **Regla de oro**: cada columna del `SELECT` está en el `GROUP BY` o dentro de una agregación.
- Se puede agrupar por varias columnas (un grupo por combinación) y ordenar por el alias de una agregación.
- Ordena con un desempate: los empates en los recuentos son muy habituales.

En el siguiente paso aprenderás a quedarte solo con algunos grupos, por ejemplo "los países con al menos 4 clientes".
:::
