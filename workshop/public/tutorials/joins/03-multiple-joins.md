## Objetivo del paso

Las preguntas interesantes suelen cruzar más de dos tablas: "¿qué productos compró Sofía?" atraviesa clientes, pedidos, líneas de pedido y productos. En este paso aprendes:

1. A encadenar varios JOINs.
2. A recorrer una relación de muchos a muchos a través de su tabla intermedia.
3. A evitar filas repetidas cuando el camino multiplica las combinaciones.

## Encadenar JOINs

Cada JOIN añade una tabla más al resultado, siguiendo una flecha del diagrama. Las líneas del pedido 14, con el nombre del cliente y de cada producto:

```sql run title="El pedido 14, completo"
SELECT o.id AS order_id, c.first_name, p.name AS product, oi.quantity, oi.unit_price
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
WHERE o.id = 14;
```

:::concept Un camino por el diagrama
Lee los JOINs como un camino: de `orders` a su cliente (`customers`), de `orders` a sus líneas (`order_items`) y de cada línea a su producto (`products`). Cada `ON` es una flecha del diagrama del panel **Datos**. Cuando te pierdas en una consulta con muchas tablas, dibuja (o mira) el camino.
:::

## Muchos a muchos

`orders` y `products` tienen una relación de muchos a muchos, y `order_items` es su tabla intermedia. Para ir de un lado al otro siempre se pasa por ella. ¿Qué productos ha comprado la clienta 1, Ana García?

```sql run title="Productos comprados por Ana (con repetidos)"
SELECT p.name
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
WHERE o.customer_id = 1;
```

Si un cliente compró el mismo producto en dos pedidos distintos, aparecería **dos veces**: el resultado tiene una fila por cada línea de pedido. Cuando la pregunta es "qué productos" (no "qué líneas"), quita los repetidos con `DISTINCT`:

```sql run title="Productos distintos comprados por Ana"
SELECT DISTINCT p.name
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
WHERE o.customer_id = 1;
```

:::warning JOINs que multiplican filas
Un JOIN produce una fila por cada **pareja**. Si unes un cliente con sus 3 pedidos y cada pedido con sus 2 líneas, ese cliente aparece 6 veces. Es correcto, pero si después sumas o cuentas sin pensarlo, obtendrás cifras infladas. Antes de agregar, pregúntate: **¿qué representa cada fila de mi resultado?**
:::

## Retos

::::challenge Las líneas de un pedido con su categoría
Muestra, para las líneas del **pedido 14**, el **nombre del producto**, el **nombre de su categoría**, la **cantidad** y el **precio unitario**.

:::hint
Parte de `order_items`, une con `products` y después con `categories`.
:::

:::solution
```sql
SELECT p.name AS product, cat.name AS category, oi.quantity, oi.unit_price
FROM order_items AS oi
JOIN products AS p ON p.id = oi.product_id
JOIN categories AS cat ON cat.id = p.category_id
WHERE oi.order_id = 14;
```
Para filtrar por pedido no necesitas unir `orders`: `order_items` ya tiene `order_id`. Une solo las tablas que aportan columnas o condiciones.
:::
::::

::::challenge Lo que compró Sofía
Muestra los **nombres distintos** de los productos que ha comprado la clienta **7** (Sofía Díaz).

:::hint
El camino es `orders` → `order_items` → `products`, filtrando por `o.customer_id`.
:::

:::solution
```sql
SELECT DISTINCT p.name
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
WHERE o.customer_id = 7;
```
:::
::::

::::challenge Quién compró Rayuela
Muestra el **nombre** y el **apellido** de los clientes que han comprado el producto **Rayuela**, sin repetir clientes. Filtra por el **nombre** del producto, no por su id.

:::hint
Necesitas cuatro tablas: `customers`, `orders`, `order_items` y `products`.
:::

:::hint
Filtra con `p.name = 'Rayuela'` y usa `DISTINCT` por si alguien lo compró en varios pedidos.
:::

:::solution
```sql
SELECT DISTINCT c.first_name, c.last_name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
WHERE p.name = 'Rayuela';
```
:::
::::

:::recap
- Cada JOIN añade una tabla siguiendo una flecha del diagrama: clave foránea = clave primaria.
- Una relación de **muchos a muchos** se recorre pasando por su **tabla intermedia**.
- Un JOIN da una fila por cada **pareja**: los caminos con relaciones de uno a muchos multiplican filas. Usa `DISTINCT` cuando quieras entidades distintas, y piensa qué representa cada fila antes de agregar.
- Une solo las tablas que aportan columnas o condiciones.

En el último paso combinarás JOINs con `GROUP BY` para construir informes con nombres, y medirás por qué las claves foráneas necesitan un índice.
:::
