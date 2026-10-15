## Objetivo del paso

Los informes que en el tutorial de agregaciones mostraban `product_id` o `customer_id` ya pueden mostrar nombres. En este paso aprendes:

1. A combinar JOINs con `GROUP BY`.
2. Una trampa al contar con `LEFT JOIN`: `count(*)` frente a `count(columna)`.
3. Por qué las claves foráneas necesitan un índice, midiéndolo con 200 000 pedidos.

## Informes con nombres

Ventas por categoría, con el **nombre** de la categoría:

```sql run title="Ventas por categoría"
SELECT cat.name AS category, round(sum(oi.quantity * oi.unit_price), 2) AS revenue
FROM categories AS cat
JOIN products AS p ON p.category_id = cat.id
JOIN order_items AS oi ON oi.product_id = p.id
GROUP BY cat.id, cat.name
ORDER BY revenue DESC;
```

:::tip Agrupa por la clave, muestra el nombre
Fíjate en `GROUP BY cat.id, cat.name`. Agrupar solo por `cat.name` funcionaría hoy, pero si dos categorías tuvieran el mismo nombre se mezclarían en un solo grupo. Agrupa por la **clave primaria** (que identifica cada grupo sin ambigüedad) y añade las columnas que quieres mostrar. PostgreSQL incluso permite omitir `cat.name` del `GROUP BY` cuando agrupas por la clave primaria de esa tabla, porque sabe que el nombre depende de ella; escribirla igualmente lo hace más claro.
:::

## La trampa de contar con `LEFT JOIN`

¿Cuántos pedidos tiene cada cliente, **incluidos los que no tienen ninguno**? Necesitas un `LEFT JOIN`. Mira las dos columnas:

```sql run title="count(*) frente a count(o.id)"
SELECT c.first_name, count(*) AS count_star, count(o.id) AS orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.first_name
ORDER BY orders, c.id
LIMIT 4;
```

*Alba* y *Bruno* no tienen pedidos, pero `count(*)` dice **1**. Su fila existe (el `LEFT JOIN` la conserva, con las columnas de `orders` a `NULL`), y `count(*)` cuenta **filas**. `count(o.id)` cuenta solo los valores no nulos, así que da el **0** correcto.

:::tip Con LEFT JOIN, cuenta una columna de la derecha
Para contar las parejas de un `LEFT JOIN`, usa `count(derecha.pk)`, nunca `count(*)`.
:::

## Las claves foráneas necesitan un índice

Cada JOIN de este tutorial busca filas por una clave foránea: "los pedidos cuyo `customer_id` es 7". PostgreSQL indexa automáticamente las claves primarias, pero **no** las foráneas. La tienda crea el índice a mano (`orders_customer_id_idx`). ¿Cuánto importa?

:::compare Los pedidos de un cliente, buscado por email
La comparación añade 20 000 clientes y 200 000 pedidos (10 por cliente) y busca los pedidos de un cliente a partir de su email. Una variante borra antes el índice de `orders.customer_id`.

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

```sql variant-setup
DROP INDEX orders_customer_id_idx;
```
```sql variant label="Sin índice en la clave foránea"
SELECT o.id, o.order_date
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE c.email = 'cliente42@example.com';
```
Encontrar al cliente es rápido (el email tiene un índice único), pero para encontrar **sus** pedidos PostgreSQL tiene que recorrer los 200 000 pedidos: no tiene otra forma de saber cuáles tienen `customer_id = 1042`.

```sql variant label="Con índice en la clave foránea" best
SELECT o.id, o.order_date
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE c.email = 'cliente42@example.com';
```
Con el índice sobre `orders.customer_id`, PostgreSQL va directo a los 10 pedidos del cliente. La consulta es **idéntica**: la diferencia la marca solo el índice.
:::

:::warning Indexa tus claves foráneas
Cuando crees una clave foránea, crea también un índice sobre ella, salvo que sepas que nunca vas a buscar ni a unir por esa columna. Además de acelerar los JOINs, evita que borrar un cliente obligue a recorrer la tabla de pedidos entera para comprobar que no le queda ninguno.
:::

## Retos

::::challenge Ventas por categoría
Muestra el **nombre** de cada categoría y su **importe vendido** (suma de cantidad por precio unitario), **redondeado a dos decimales**, de la que más vendió a la que menos.

:::solution
```sql ordered
SELECT cat.name AS category, round(sum(oi.quantity * oi.unit_price), 2) AS revenue
FROM categories AS cat
JOIN products AS p ON p.category_id = cat.id
JOIN order_items AS oi ON oi.product_id = p.id
GROUP BY cat.id, cat.name
ORDER BY revenue DESC;
```
:::
::::

::::challenge Los tres productos más vendidos
Muestra el **nombre** de los **3 productos con más unidades vendidas** y esas **unidades**, de más a menos. A igualdad de unidades, ordena por nombre.

:::hint
Une `products` con `order_items`, agrupa por producto y suma `quantity`.
:::

:::solution
```sql ordered
SELECT p.name, sum(oi.quantity) AS units
FROM products AS p
JOIN order_items AS oi ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY units DESC, p.name
LIMIT 3;
```
Tres productos empatan con 24 unidades en el tercer puesto: el desempate por nombre decide que entre *Cafetera italiana*.
:::
::::

::::challenge Pedidos por país
Muestra cada **país** de los clientes y el **número de pedidos** de sus clientes, **incluidos los países cuyos clientes no tienen pedidos**. Ordena de más a menos pedidos y, a igualdad, por país.

:::hint
Clientes a la izquierda con `LEFT JOIN` a pedidos, y agrupa por país.
:::

:::hint
Cuidado con `count(*)`: cuenta una columna de `orders`.
:::

:::solution
```sql ordered
SELECT c.country, count(o.id) AS orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.country
ORDER BY orders DESC, c.country;
```
Paraguay aparece con 0: su único cliente, *Bruno*, no tiene pedidos. Con `count(*)` saldría con 1.
:::
::::

::::challenge Los mejores clientes
Muestra el **nombre**, el **apellido** y el **importe gastado** (redondeado a dos decimales) de los **5 clientes que más han gastado**, sin contar los pedidos **cancelados**. Desempata por id de cliente.

:::hint
El camino es `customers` → `orders` → `order_items`. El estado está en `orders`.
:::

:::hint
Agrupa por `c.id, c.first_name, c.last_name`, suma `oi.quantity * oi.unit_price` y filtra los cancelados en el `WHERE`.
:::

:::solution
```sql ordered
SELECT c.first_name, c.last_name, round(sum(oi.quantity * oi.unit_price), 2) AS spent
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY c.id, c.first_name, c.last_name
ORDER BY spent DESC, c.id
LIMIT 5;
```
El mejor cliente es *Andrés Castro*… que está **inactivo**. Este tipo de hallazgo es justo para lo que sirven los informes.
:::
::::

:::recap
En este tutorial has aprendido a combinar tablas:

- `INNER JOIN` devuelve las parejas que cumplen el `ON`; `LEFT JOIN` conserva además las filas sin pareja de la izquierda.
- El **anti-join** (`LEFT JOIN ... WHERE derecha.pk IS NULL`) encuentra lo que no existe.
- Las condiciones sobre la tabla derecha de un `LEFT JOIN` van en el `ON`.
- Varias tablas se unen siguiendo las flechas del diagrama; las relaciones N:M pasan por la tabla intermedia.
- Con JOINs y `GROUP BY`: agrupa por la clave y cuenta con `count(derecha.pk)` en un `LEFT JOIN`.
- **Indexa las claves foráneas**: la misma consulta pasa de recorrer los 200 000 pedidos (más de 1 200 páginas) a leer unas pocas páginas.

Con este tutorial terminas el nivel **Principiante**. En el siguiente nivel empezarás con **subconsultas y CTEs**, para escribir consultas dentro de consultas.
:::
