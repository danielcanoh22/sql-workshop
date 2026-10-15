## Objetivo del paso

Vas a escribir tu primer JOIN para mostrar cada pedido junto al nombre de su cliente. Al terminar sabrás:

1. Cómo funciona `JOIN ... ON` y qué filas devuelve.
2. Usar alias de tabla y calificar las columnas.
3. Combinar un JOIN con `WHERE` y `ORDER BY`.

## El problema

```sql run title="Los pedidos, sin nombres"
SELECT id, customer_id, order_date
FROM orders
ORDER BY id
LIMIT 5;
```

`customer_id` dice **a quién** pertenece cada pedido, pero no su nombre: ese dato está en `customers`. Necesitas, para cada pedido, buscar la fila de `customers` cuyo `id` coincide con el `customer_id` del pedido.

## `JOIN ... ON`

```sql run title="Cada pedido con el nombre de su cliente"
SELECT orders.id, orders.order_date, customers.first_name, customers.last_name
FROM orders
JOIN customers ON customers.id = orders.customer_id
ORDER BY orders.id
LIMIT 5;
```

:::concept Qué hace un JOIN
`FROM orders JOIN customers ON customers.id = orders.customer_id` combina cada fila de `orders` con cada fila de `customers` que cumpla la condición del `ON`. Como cada pedido tiene exactamente un cliente, el resultado tiene **una fila por pedido**, con las columnas de las dos tablas disponibles.

La condición del `ON` casi siempre es la misma: **la clave foránea igual a la clave primaria** a la que apunta. Es la flecha `orders.customer_id → customers.id` del diagrama.
:::

`JOIN` a secas significa `INNER JOIN`: solo aparecen las combinaciones que cumplen el `ON`. Un cliente sin pedidos no tiene ninguna fila de `orders` con la que emparejarse, así que no aparece en el resultado. Verás cómo conservarlo en el siguiente paso.

## Alias de tabla

Escribir `customers.first_name` una y otra vez es largo. Un **alias de tabla** le da un nombre corto:

```sql run title="Lo mismo, con alias"
SELECT o.id, o.order_date, c.first_name, c.last_name
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
ORDER BY o.id
LIMIT 5;
```

Elige alias que se entiendan: la inicial de la tabla (`o`, `c`, `p`) es la convención habitual.

## Columnas ambiguas

Las dos tablas tienen una columna `id`. Si no dices de cuál hablas, PostgreSQL no lo adivina:

```sql run error title="¿El id de qué tabla?"
SELECT id, first_name
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id;
```

`column reference "id" is ambiguous`. La solución es **calificar** la columna: `o.id` o `c.id`.

:::tip Califica todas las columnas
En una consulta con JOINs, escribe **todas** las columnas con su alias (`c.first_name`, no `first_name`), aunque no sean ambiguas hoy. Si mañana alguien añade una columna `first_name` a la otra tabla, tu consulta dejaría de funcionar.
:::

## JOIN con WHERE y ORDER BY

Todo lo que ya sabes funciona igual: el JOIN forma las filas combinadas (parte del `FROM`) y después `WHERE`, `ORDER BY` y `LIMIT` trabajan sobre ellas. Puedes filtrar por columnas de cualquiera de las dos tablas:

```sql run title="Pedidos de clientes de Colombia"
SELECT o.id, o.order_date, o.status, c.first_name
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE c.country = 'Colombia'
ORDER BY o.order_date;
```

## Retos

::::challenge Pedidos cancelados
Muestra el **id**, la **fecha** de los pedidos **cancelados** y el **nombre** y **apellido** de su cliente, del pedido más antiguo al más reciente.

:::hint
Une `orders` con `customers` por `customer_id` y filtra por `o.status`.
:::

:::solution
```sql ordered
SELECT o.id, o.order_date, c.first_name, c.last_name
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'cancelled'
ORDER BY o.order_date;
```
:::
::::

::::challenge Productos caros con su categoría
Muestra el **nombre del producto** y el **nombre de su categoría** de los productos que cuestan **más de 80**.

:::hint
La flecha del diagrama es `products.category_id → categories.id`. Las dos tablas tienen una columna `name`: dales alias en el `SELECT`.
:::

:::solution
```sql
SELECT p.name AS product, c.name AS category
FROM products AS p
JOIN categories AS c ON c.id = p.category_id
WHERE p.price > 80;
```
Los alias de columna (`AS product`, `AS category`) son importantes cuando dos tablas tienen columnas con el mismo nombre: sin ellos, el resultado tendría dos columnas llamadas `name`.
:::
::::

::::challenge Pedidos de clientes inactivos
Muestra el **id** y el **estado** de los pedidos hechos por clientes que **no están activos**, junto al **email** del cliente.

:::hint
La condición es sobre una columna de `customers` (`is_active`), aunque las filas que quieres son pedidos.
:::

:::solution
```sql
SELECT o.id, o.status, c.email
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE NOT c.is_active;
```
:::
::::

:::recap
- `FROM a JOIN b ON condición` combina las filas de `a` con las de `b` que cumplen la condición.
- La condición suele ser **clave foránea = clave primaria**.
- `JOIN` es `INNER JOIN`: las filas sin pareja no aparecen.
- Usa **alias de tabla** y **califica todas las columnas**; si dos columnas se llaman igual, dales un alias en el `SELECT`.
- `WHERE`, `ORDER BY` y `LIMIT` trabajan sobre las filas ya combinadas.

En el siguiente paso aprenderás a conservar las filas sin pareja y a encontrar lo que falta: los clientes que nunca compraron.
:::
