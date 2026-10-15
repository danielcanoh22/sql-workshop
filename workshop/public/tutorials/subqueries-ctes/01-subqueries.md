## Objetivo del paso

Una **subconsulta** es una consulta entre paréntesis dentro de otra. En este paso aprendes:

1. Subconsultas que devuelven **un solo valor**, usadas como si fueran un número o una fecha.
2. Subconsultas **correlacionadas**, que dependen de la fila que se está evaluando.

## Una consulta dentro de otra

¿Qué productos cuestan más que la media? Necesitas la media antes de poder comparar:

```sql run title="Paso 1: la media"
SELECT avg(price)
FROM products;
```

En lugar de copiar ese número a mano en otra consulta, se escribe la consulta **dentro**:

```sql run title="Productos más caros que la media"
SELECT name, price
FROM products
WHERE price > (SELECT avg(price) FROM products)
ORDER BY price;
```

:::concept Subconsulta escalar
Una subconsulta que devuelve **una fila y una columna** se llama **escalar**, y puede usarse en cualquier sitio donde iría un valor: en `WHERE`, en el `SELECT`, en una operación. PostgreSQL la calcula **una vez** y usa su resultado.

Si devolviera más de una fila, sería un error: `more than one row returned by a subquery used as an expression`.
:::

Otro uso muy habitual: buscar la fila del máximo o del mínimo.

```sql run title="El pedido más reciente"
SELECT id, customer_id, order_date
FROM orders
WHERE order_date = (SELECT max(order_date) FROM orders);
```

:::tip ¿Por qué no ORDER BY y LIMIT 1?
`ORDER BY order_date DESC LIMIT 1` también da el pedido más reciente, y es igual de bueno. La diferencia aparece con los empates: si dos pedidos compartieran la fecha máxima, la subconsulta devolvería **los dos** y `LIMIT 1` solo uno, elegido al azar. Elige según lo que necesites.
:::

## Subconsultas correlacionadas

Una subconsulta puede usar columnas de la consulta de fuera. Por ejemplo, para cada categoría, cuántos productos tiene:

```sql run title="Productos de cada categoría, con una subconsulta"
SELECT c.name,
       (SELECT count(*) FROM products AS p WHERE p.category_id = c.id) AS products
FROM categories AS c
ORDER BY c.id;
```

:::concept Correlacionada: una vez por fila
La subconsulta usa `c.id`, que viene de la consulta de fuera. Ya no se puede calcular una sola vez: se evalúa **para cada categoría**, con el `c.id` de esa fila. A eso se le llama subconsulta **correlacionada**.

Con 6 categorías no importa. Con 20 000 clientes, una subconsulta correlacionada se ejecuta 20 000 veces: lo medirás en el último paso.
:::

Las correlacionadas en el `WHERE` permiten preguntas como "los productos más caros que la media **de su** categoría": se compara cada producto con la media de los productos de **su misma** categoría.

```sql run title="Productos más caros que la media de su categoría"
SELECT p.name, p.price, p.category_id
FROM products AS p
WHERE p.price > (
  SELECT avg(p2.price)
  FROM products AS p2
  WHERE p2.category_id = p.category_id
)
ORDER BY p.category_id, p.price;
```

Fíjate en los alias: `p` es la fila de fuera y `p2` las filas de la subconsulta. Sin alias distintos no se podría decir "los productos de la categoría **de este** producto".

## Retos

::::challenge Más caros que la media
Muestra el **nombre** y el **precio** de los productos cuyo precio es **mayor que el precio medio** de todos los productos.

:::solution
```sql
SELECT name, price
FROM products
WHERE price > (SELECT avg(price) FROM products);
```
:::
::::

::::challenge El primer cliente
Muestra el **nombre**, el **apellido** y la **fecha de alta** del cliente que se registró **antes que nadie**, usando una subconsulta.

:::hint
La fecha más antigua de `signup_date` se obtiene con `min`.
:::

:::solution
```sql
SELECT first_name, last_name, signup_date
FROM customers
WHERE signup_date = (SELECT min(signup_date) FROM customers);
```
:::
::::

::::challenge El más caro de cada categoría
Muestra el **nombre**, el **precio** y la **categoría** (`category_id`) del producto **más caro de cada categoría**, ordenado por categoría.

:::hint
Compara el precio de cada producto con el máximo de los productos **de su misma categoría**: es una subconsulta correlacionada.
:::

:::hint
`WHERE p.price = (SELECT max(p2.price) FROM products AS p2 WHERE p2.category_id = p.category_id)`.
:::

:::solution
```sql ordered
SELECT p.name, p.price, p.category_id
FROM products AS p
WHERE p.price = (
  SELECT max(p2.price)
  FROM products AS p2
  WHERE p2.category_id = p.category_id
)
ORDER BY p.category_id;
```
Este patrón, "la fila con el máximo de su grupo", es uno de los más pedidos en entrevistas y en aplicaciones reales. También se resuelve con funciones de ventana, que verás en la parte de PostgreSQL.
:::
::::

:::recap
- Una **subconsulta** es una consulta entre paréntesis dentro de otra.
- Una subconsulta **escalar** devuelve un solo valor y se usa donde iría un valor; se calcula una vez.
- Una subconsulta **correlacionada** usa columnas de la consulta de fuera y se evalúa **una vez por fila**.
- Usa alias distintos (`p` y `p2`) cuando la subconsulta lee la misma tabla que la consulta de fuera.

En el siguiente paso usarás subconsultas que devuelven listas con `IN` y `EXISTS`.
:::
