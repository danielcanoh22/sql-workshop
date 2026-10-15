## Objetivo del paso

Vas a escribir lógica condicional dentro de una consulta. Al terminar sabrás:

1. Clasificar filas con `CASE`.
2. Ordenar con un orden propio, no alfabético.
3. Contar y sumar solo las filas que cumplen una condición.
4. Sustituir `NULL` con `COALESCE` y evitar divisiones por cero con `NULLIF`.

## `CASE`: un "si… entonces…" por fila

```sql run title="Segmento de precio de cada producto"
SELECT name,
       price,
       CASE
         WHEN price < 20 THEN 'económico'
         WHEN price < 60 THEN 'medio'
         ELSE 'premium'
       END AS segment
FROM products
ORDER BY price;
```

:::concept Cómo se evalúa un CASE
Las condiciones `WHEN` se prueban **en orden** y se usa la **primera** que se cumple. Por eso la segunda puede ser solo `price < 60`: los menores de 20 ya se quedaron en la primera. Si ninguna se cumple, se usa el `ELSE`; sin `ELSE`, el resultado es `NULL`.
:::

Cuando todas las condiciones comparan la misma columna con valores fijos, hay una forma corta:

```sql run title="Traducir estados"
SELECT id,
       CASE status
         WHEN 'pending' THEN 'Pendiente'
         WHEN 'paid' THEN 'Pagado'
         WHEN 'shipped' THEN 'Enviado'
         WHEN 'delivered' THEN 'Entregado'
         ELSE 'Cancelado'
       END AS status_label
FROM orders
ORDER BY id
LIMIT 5;
```

## Un orden propio

Los estados de un pedido tienen un orden natural (pendiente → pagado → enviado → entregado) que no es el alfabético. `CASE` en el `ORDER BY` lo resuelve:

```sql run title="Pedidos en el orden del proceso"
SELECT id, status
FROM orders
ORDER BY CASE status
           WHEN 'pending' THEN 1
           WHEN 'paid' THEN 2
           WHEN 'shipped' THEN 3
           WHEN 'delivered' THEN 4
           ELSE 5
         END,
         id
LIMIT 10;
```

## Agregaciones condicionales

Varios recuentos distintos en una sola pasada por la tabla:

```sql run title="Clientes activos e inactivos por país"
SELECT country,
       count(*) AS customers,
       count(*) FILTER (WHERE is_active) AS active,
       count(*) FILTER (WHERE NOT is_active) AS inactive
FROM customers
GROUP BY country
ORDER BY country;
```

:::postgres FILTER y la versión portable
`FILTER (WHERE ...)` es SQL estándar, pero no todas las bases de datos lo admiten. La versión que funciona en todas usa `CASE` dentro de la agregación: `sum(CASE WHEN is_active THEN 1 ELSE 0 END)`. En PostgreSQL, `FILTER` se lee mejor.
:::

## `COALESCE`: un valor en lugar de `NULL`

`COALESCE(a, b, c)` devuelve el **primer valor que no es `NULL`**:

```sql run title="Sin ciudad, un texto"
SELECT first_name, COALESCE(city, 'Sin ciudad') AS city
FROM customers
WHERE country = 'Chile';
```

Es la solución a lo que viste en **SELECT y WHERE**: `first_name || ' (' || city || ')'` daba `NULL` para quien no tenía ciudad. Con `COALESCE(city, '?')` dentro, ya no.

## `NULLIF`: evitar una división por cero

`NULLIF(a, b)` devuelve `NULL` si `a = b`, y `a` en otro caso. Su uso estrella es evitar dividir por cero:

```sql run error title="Una división por cero"
SELECT 100 / count(*)
FROM products
WHERE category_id = 99;
```

```sql run title="Con NULLIF, NULL en lugar de error"
SELECT 100 / NULLIF(count(*), 0) AS ratio
FROM products
WHERE category_id = 99;
```

Dividir entre `NULL` da `NULL`, que la aplicación puede mostrar como "sin datos".

## Retos

::::challenge Segmentos de precio
Muestra el **nombre**, el **precio** y una columna `segment` para cada producto: `'económico'` por debajo de 20, `'medio'` desde 20 y por debajo de 60, y `'premium'` desde 60.

:::hint
Un `CASE` con dos `WHEN` y un `ELSE`, en el orden adecuado.
:::

:::solution
```sql
SELECT name,
       price,
       CASE
         WHEN price < 20 THEN 'económico'
         WHEN price < 60 THEN 'medio'
         ELSE 'premium'
       END AS segment
FROM products;
```
:::
::::

::::challenge Productos por disponibilidad
Para cada **categoría** (`category_id`), muestra el **número de productos**, cuántos tienen **stock** (más de 0) y cuántos están **agotados**. Ordena por categoría.

:::hint
`count(*) FILTER (WHERE ...)` dos veces, con condiciones opuestas.
:::

:::solution
```sql ordered
SELECT category_id,
       count(*) AS products,
       count(*) FILTER (WHERE stock > 0) AS in_stock,
       count(*) FILTER (WHERE stock = 0) AS sold_out
FROM products
GROUP BY category_id
ORDER BY category_id;
```
:::
::::

::::challenge Etiqueta de cliente
Muestra para cada cliente una columna `label` con el formato `Nombre (Ciudad)`, por ejemplo `Ana (Madrid)`. Si no tiene ciudad, debe mostrar `Diego (sin ciudad)`.

:::hint
Une textos con `||` y protege la ciudad con `COALESCE`.
:::

:::solution
```sql
SELECT first_name || ' (' || COALESCE(city, 'sin ciudad') || ')' AS label
FROM customers;
```
:::
::::

::::challenge Pedidos en orden de proceso
Muestra el **id** y el **estado** de los **10 primeros pedidos** según el orden del proceso: primero los pendientes, después los pagados, enviados, entregados y, al final, los cancelados. Dentro de cada estado, por id.

:::solution
```sql ordered
SELECT id, status
FROM orders
ORDER BY CASE status
           WHEN 'pending' THEN 1
           WHEN 'paid' THEN 2
           WHEN 'shipped' THEN 3
           WHEN 'delivered' THEN 4
           ELSE 5
         END,
         id
LIMIT 10;
```
Si el orden del proceso se usa en muchas consultas, es una señal de que convendría una **tabla de referencia** de estados con una columna de orden, como viste en **Modelado de datos**.
:::
::::

:::recap
- `CASE WHEN ... THEN ... ELSE ... END` evalúa condiciones en orden y usa la primera que se cumple.
- `CASE` sirve en el `SELECT`, en el `ORDER BY` (órdenes propios) y dentro de agregaciones.
- `count(*) FILTER (WHERE ...)` cuenta solo las filas que cumplen la condición.
- `COALESCE(a, b)` sustituye `NULL`; `NULLIF(a, 0)` evita divisiones por cero.

En el siguiente paso trabajarás con textos: limpiarlos, cortarlos, unirlos y juntarlos en listas.
:::
