## Objetivo del paso

Con `INNER JOIN`, los clientes que nunca compraron desaparecen del resultado. A veces es justo lo que quieres; otras veces son precisamente los que buscas. En este paso aprendes:

1. `LEFT JOIN`: conservar todas las filas de la tabla de la izquierda.
2. Encontrar lo que **no** existe: el *anti-join*.
3. La trampa más común con `LEFT JOIN`: filtrar en `WHERE`.

## `LEFT JOIN`

Compara cuántas filas devuelve cada tipo de JOIN entre clientes y pedidos:

```sql run title="INNER JOIN: una fila por pedido"
SELECT count(*) AS row_count
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id;
```

```sql run title="LEFT JOIN: además, los clientes sin pedidos"
SELECT count(*) AS row_count
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id;
```

90 frente a 92. Las dos filas de más son los clientes que no tienen ningún pedido.

:::concept Qué hace LEFT JOIN
`a LEFT JOIN b ON ...` devuelve lo mismo que `INNER JOIN` **más** las filas de `a` (la tabla de la izquierda) que no encontraron ninguna pareja en `b`. Para esas filas, todas las columnas de `b` vienen a **`NULL`**.
:::

```sql run title="Los clientes sin pedidos, con columnas a NULL"
SELECT c.id, c.first_name, o.id AS order_id, o.status
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY o.id NULLS FIRST, c.id
LIMIT 5;
```

*Alba* y *Bruno* aparecen con `order_id` y `status` a `NULL`: no tienen pedidos.

## Encontrar lo que no existe

Esa es la idea para responder "¿qué clientes **no** tienen pedidos?": un `LEFT JOIN` y quedarse con las filas donde la parte derecha vino a `NULL`.

```sql run title="Clientes que nunca compraron"
SELECT c.first_name, c.last_name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

:::tip Comprueba una columna que nunca es NULL
En el `WHERE ... IS NULL` usa una columna de la tabla derecha que **no puede** ser `NULL` en una fila real, como su clave primaria (`o.id`). Si comprobaras una columna que admite `NULL` (por ejemplo, una dirección de envío opcional), confundirías "no hay pedido" con "el pedido no tiene ese dato".
:::

A este patrón se le llama **anti-join**. En el tutorial de subconsultas verás otra forma de escribirlo, `NOT EXISTS`, que muchos prefieren porque expresa la intención más directamente.

## La trampa: filtrar la tabla derecha en `WHERE`

Queremos **todos** los clientes y, si tienen alguno, sus pedidos **cancelados**. Esta consulta parece correcta:

```sql run title="¿Todos los clientes con sus pedidos cancelados?"
SELECT c.first_name, o.id AS cancelled_order
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'cancelled';
```

Solo 9 filas: los clientes **sin** pedidos cancelados han desaparecido. ¿Por qué?

:::concept WHERE se evalúa después del LEFT JOIN
El `LEFT JOIN` produce primero todas las filas, incluidos los clientes sin pareja, con `o.status` a `NULL`. Después, `WHERE o.status = 'cancelled'` descarta todas las filas donde la condición no es verdadera, y **`NULL = 'cancelled'` no es verdadero**. El resultado: el `LEFT JOIN` se comporta como un `INNER JOIN`.
:::

La solución es poner la condición sobre la tabla derecha **en el `ON`**, que decide qué filas de `orders` cuentan como pareja:

```sql run title="La condición en el ON"
SELECT c.first_name, o.id AS cancelled_order
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'cancelled';
```

30 filas: todos los clientes, y el pedido cancelado solo cuando lo hay.

:::tip Regla para LEFT JOIN
- Las condiciones sobre la tabla **derecha** van en el **`ON`**.
- Las condiciones sobre la tabla **izquierda** (qué clientes quieres) van en el **`WHERE`**.
:::

## RIGHT, FULL y NATURAL JOIN

- **`RIGHT JOIN`** es un `LEFT JOIN` con las tablas al revés. Por convención se escribe siempre `LEFT JOIN`, poniendo a la izquierda la tabla cuyas filas quieres conservar: se lee mejor.
- **`FULL JOIN`** conserva las filas sin pareja de **ambos** lados. Es útil en informes de conciliación ("lo que está en A y no en B, y viceversa"), pero raro en una aplicación.
- **`NATURAL JOIN`** une automáticamente por todas las columnas que se llaman igual. **No lo uses**: si mañana alguien añade una columna `created_at` a las dos tablas, la consulta cambia de significado sin ningún aviso.

## Retos

::::challenge Productos que nunca se vendieron
Muestra el **nombre** de los productos que **no aparecen en ninguna línea de pedido**.

:::hint
Los productos a la izquierda, las líneas de pedido (`order_items`) a la derecha.
:::

:::hint
Quédate con las filas en las que la parte de `order_items` vino a `NULL`. `order_items` no tiene una columna `id`, pero `order_id` nunca es `NULL` en una línea real.
:::

:::solution
```sql
SELECT p.name
FROM products AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.id
WHERE oi.order_id IS NULL;
```
*Peluche oso* y *Kit de química*: candidatos a una promoción.
:::
::::

::::challenge Clientes sin pedidos pendientes
Muestra el **nombre** y el **apellido** de los clientes que **no tienen ningún pedido pendiente** (`'pending'`). Incluye a los que no tienen ningún pedido.

:::hint
Es un anti-join, pero solo contra los pedidos pendientes. ¿Dónde va la condición sobre el estado?
:::

:::hint
`LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'pending'`, y después `WHERE o.id IS NULL`.
:::

:::solution
```sql
SELECT c.first_name, c.last_name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'pending'
WHERE o.id IS NULL;
```
Si pusieras `o.status = 'pending'` en el `WHERE`, junto a `o.id IS NULL`, no saldría ninguna fila: ninguna fila puede tener a la vez el estado `'pending'` y el id a `NULL`.
:::
::::

::::challenge Todos los clientes y su pedido pendiente
Muestra el **nombre** de **todos** los clientes y, a su lado, el **id de su pedido pendiente** si tienen alguno (si no, vacío).

:::solution
```sql
SELECT c.first_name, o.id AS pending_order
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'pending';
```
En la tienda nadie tiene más de un pedido pendiente, así que sale una fila por cliente. Si alguien tuviera dos, aparecería dos veces: un JOIN produce una fila por cada **pareja**.
:::
::::

:::recap
- `LEFT JOIN` conserva todas las filas de la izquierda; las que no tienen pareja traen `NULL` en las columnas de la derecha.
- **Anti-join**: `LEFT JOIN ... WHERE derecha.pk IS NULL` encuentra lo que no tiene pareja.
- Las condiciones sobre la tabla derecha van en el **`ON`**; en el `WHERE` convierten el `LEFT JOIN` en un `INNER JOIN`.
- Escribe siempre `LEFT JOIN` (no `RIGHT`); evita `NATURAL JOIN`.

En el siguiente paso unirás más de dos tablas para recorrer las relaciones de muchos a muchos.
:::
