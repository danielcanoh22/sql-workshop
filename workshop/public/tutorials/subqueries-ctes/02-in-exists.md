## Objetivo del paso

Muchas preguntas son de existencia: "los clientes que **tienen** algún pedido cancelado", "los productos que **nunca** se vendieron". En este paso aprendes:

1. `IN` con una subconsulta que devuelve una lista.
2. `EXISTS` y `NOT EXISTS`.
3. Por qué `NOT IN` con una subconsulta puede devolver cero filas sin avisar.

## `IN` con una subconsulta

En **SELECT y WHERE** escribiste listas a mano: `category_id IN (2, 6)`. La lista también puede salir de una consulta. Los clientes que compraron algún producto de Electrónica (categoría 1):

```sql run title="Clientes que compraron Electrónica"
SELECT first_name, last_name
FROM customers
WHERE id IN (
  SELECT o.customer_id
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN products AS p ON p.id = oi.product_id
  WHERE p.category_id = 1
);
```

:::why ¿Por qué no un JOIN?
Con un JOIN de `customers` a `order_items`, un cliente que compró tres productos de Electrónica aparecería **tres veces**, y tendrías que añadir `DISTINCT`. Con `IN`, la pregunta es solo "¿su id está en la lista?": cada cliente aparece **una vez** como mucho. Cuando quieres filas de una tabla según si existe algo en otra, `IN` o `EXISTS` expresan la intención mejor que un JOIN.
:::

## `EXISTS`

`EXISTS (subconsulta)` es verdadero si la subconsulta devuelve **al menos una fila**. Suele ser correlacionada:

```sql run title="Clientes con algún pedido cancelado"
SELECT c.first_name, c.last_name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.id AND o.status = 'cancelled'
);
```

El `SELECT 1` es una convención: a `EXISTS` no le importan las columnas, solo si hay filas.

:::postgres EXISTS no recorre todo
PostgreSQL no ejecuta la subconsulta de `EXISTS` cliente por cliente de forma ingenua: la convierte en un **semi-join**, una variante de JOIN que se detiene en la primera coincidencia y no duplica filas. `IN` con subconsulta se planifica igual. En la práctica, elige el que se lea mejor.
:::

## `NOT EXISTS`: lo que no existe

```sql run title="Productos que nunca se vendieron"
SELECT p.name
FROM products AS p
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items AS oi
  WHERE oi.product_id = p.id
);
```

Es la misma pregunta que resolviste con el anti-join (`LEFT JOIN ... WHERE oi.order_id IS NULL`), y PostgreSQL ejecuta ambas de forma parecida. `NOT EXISTS` tiene una ventaja: se lee exactamente como la pregunta.

## La trampa de `NOT IN`

Queremos los clientes que **no** viven en ninguna ciudad donde tengamos clientes chilenos. Con `NOT IN` parece natural:

```sql run title="NOT IN con una subconsulta"
SELECT first_name, city
FROM customers
WHERE city NOT IN (SELECT city FROM customers WHERE country = 'Chile');
```

**Cero filas.** Uno de los clientes chilenos, *Diego*, no tiene ciudad: la subconsulta devuelve `('Santiago', NULL)`, y como viste en **SELECT y WHERE**, un `NULL` dentro de `NOT IN` hace que la condición nunca sea verdadera.

Con `NOT EXISTS` no pasa:

```sql run title="NOT EXISTS: el resultado correcto"
SELECT c.first_name, c.city
FROM customers AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM customers AS ch
  WHERE ch.country = 'Chile' AND ch.city = c.city
);
```

:::warning Usa NOT EXISTS, no NOT IN, con subconsultas
`NOT IN (subconsulta)` devuelve cero filas en cuanto la subconsulta incluye un solo `NULL`, sin ningún error. Hoy la columna puede no tener `NULL`; mañana alguien cambia la tabla y tu consulta deja de funcionar en silencio. Para "lo que no está en", usa **`NOT EXISTS`** (o el anti-join). `NOT IN` solo es seguro con listas escritas a mano.
:::

## Retos

::::challenge Clientes con pedidos cancelados
Muestra el **nombre** y el **apellido** de los clientes que tienen **al menos un pedido cancelado**. Usa `EXISTS`.

:::solution
```sql
SELECT c.first_name, c.last_name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.id AND o.status = 'cancelled'
);
```
:::
::::

::::challenge Clientes que nunca compraron
Muestra el **nombre** y el **apellido** de los clientes que **no tienen ningún pedido**. Usa `NOT EXISTS`.

:::hint
La subconsulta busca pedidos de **ese** cliente: `WHERE o.customer_id = c.id`.
:::

:::solution
```sql
SELECT c.first_name, c.last_name
FROM customers AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.id
);
```
:::
::::

::::challenge Productos de categorías sin agotados
Muestra el **nombre** y el **precio** de los productos que pertenecen a una categoría en la que **ningún producto está agotado** (stock 0).

:::hint
Para cada producto `p`, comprueba que **no existe** otro producto de su misma categoría con `stock = 0`.
:::

:::hint
`WHERE NOT EXISTS (SELECT 1 FROM products AS p2 WHERE p2.category_id = p.category_id AND p2.stock = 0)`.
:::

:::solution
```sql
SELECT p.name, p.price
FROM products AS p
WHERE NOT EXISTS (
  SELECT 1
  FROM products AS p2
  WHERE p2.category_id = p.category_id AND p2.stock = 0
);
```
Solo Deportes y Juguetes tienen todos sus productos con stock.
:::
::::

:::recap
- `columna IN (subconsulta)` comprueba si un valor está en una lista calculada; cada fila aparece una vez como mucho.
- `EXISTS (subconsulta)` es verdadero si la subconsulta devuelve alguna fila; `NOT EXISTS`, si no devuelve ninguna.
- PostgreSQL ejecuta `IN` y `EXISTS` como **semi-joins**: elige el que se lea mejor.
- **`NOT IN` con una subconsulta es peligroso**: un solo `NULL` hace que no salga ninguna fila. Usa `NOT EXISTS`.

En el siguiente paso aprenderás a dar nombre a las subconsultas con `WITH` para que las consultas largas se lean de arriba abajo.
:::
