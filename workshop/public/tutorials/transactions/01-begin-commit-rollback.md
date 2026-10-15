## Objetivo del paso

Vas a agrupar varios cambios en una transacción y decidir si se guardan o se descartan. Al terminar sabrás:

1. Qué es una transacción y qué problema resuelve.
2. Usar `BEGIN`, `COMMIT` y `ROLLBACK`.
3. Qué significan las siglas **ACID**.

## El problema

Una venta en la tienda son tres escrituras:

1. Crear el pedido en `orders`.
2. Crear sus líneas en `order_items`.
3. Descontar el stock de cada producto en `products`.

Si la tercera falla (por ejemplo, porque no queda stock y el `CHECK (stock >= 0)` lo rechaza) o la aplicación se cae justo antes, quedaría un pedido registrado con el stock sin descontar. Los datos ya no cuadran, y nadie se entera.

:::concept Transacción
Una **transacción** es un grupo de sentencias que la base de datos trata como **una unidad**: o se aplican **todas**, o **ninguna**. No existe el estado intermedio.
:::

## Sin saberlo, ya usabas transacciones

PostgreSQL trabaja en modo **autocommit**: cada sentencia suelta es su propia transacción, y se confirma sola al terminar. Por eso un `UPDATE` que falla a mitad no deja la mitad de las filas cambiadas. Y un bloque con varias sentencias, como los que ejecutas aquí, también se ejecuta como una unidad. Pero en una aplicación las sentencias se envían **una a una**, y entre una y otra puede pasar cualquier cosa. Para agruparlas se usa `BEGIN`.

## `BEGIN` y `ROLLBACK`

`BEGIN` abre una transacción. Ejecuta este bloque y fíjate en el aviso que aparece debajo del resultado:

```sql run title="Abrir una transacción y descontar stock"
BEGIN;

UPDATE products
SET stock = stock - 2
WHERE id = 5
RETURNING name, stock;
```

El `Cargador USB-C` tiene ahora 298 unidades… **dentro de tu transacción**. Si otra conexión mirara la tabla, seguiría viendo 300: el cambio no es definitivo. Tú sí lo ves:

```sql run title="Dentro de la transacción"
SELECT name, stock
FROM products
WHERE id = 5;
```

`ROLLBACK` **descarta** todo lo hecho desde el `BEGIN`:

```sql run title="Descartar los cambios"
ROLLBACK;

SELECT name, stock
FROM products
WHERE id = 5;
```

Vuelve a tener 300, como si nada hubiera pasado.

## `COMMIT`

`COMMIT` **confirma** la transacción: todos sus cambios se vuelven definitivos y visibles para todo el mundo, a la vez.

```sql run title="Una venta completa, confirmada"
BEGIN;

INSERT INTO orders (customer_id, order_date, status)
VALUES (2, '2025-12-31', 'pending');

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT max(id), 5, 2, 19.99
FROM orders;

UPDATE products
SET stock = stock - 2
WHERE id = 5;

COMMIT;
```

:::warning Ese max(id) es solo para el ejemplo
`SELECT max(id) FROM orders` funciona aquí porque estás solo, pero en una aplicación con varios usuarios otro pedido podría crearse entre tu `INSERT` y tu `SELECT`, y tu línea iría a parar al pedido de otro. La forma correcta de obtener el id recién creado es `RETURNING`, como harás en el reto.
:::

## ACID, en una tabla

Las transacciones de PostgreSQL cumplen cuatro propiedades, conocidas por sus siglas en inglés:

| Propiedad | Significa | En la tienda |
| --- | --- | --- |
| **Atomicidad** | Todo o nada | El pedido, sus líneas y el stock cambian juntos |
| **Consistencia** | Al terminar, se cumplen todas las restricciones | Nunca queda stock negativo ni una línea sin pedido |
| **Aislamiento** | Las transacciones simultáneas no se pisan | Otro cliente no ve tu pedido a medias |
| **Durabilidad** | Lo confirmado no se pierde | Tras el `COMMIT`, el pedido sobrevive a un corte de luz |

## Retos

::::challenge Registrar una venta
Registra en **una transacción** la venta de **2 unidades** del producto **5** (*Cargador USB-C*, a **19.99**) a la clienta **2**, con fecha **2025-12-31** y estado **pendiente**: el pedido, su línea y el descuento de stock. Usa `RETURNING` para obtener el id del pedido, no `max(id)`.

```sql verify
SELECT 'pedido' AS item, o.status || ' · ' || o.order_date AS detail
FROM orders AS o
WHERE o.customer_id = 2 AND o.order_date = '2025-12-31'
UNION ALL
SELECT 'línea', oi.product_id || ' × ' || oi.quantity || ' a ' || oi.unit_price
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
WHERE o.customer_id = 2 AND o.order_date = '2025-12-31'
UNION ALL
SELECT 'stock del producto 5', stock::text
FROM products
WHERE id = 5;
```

:::hint
Recuerda el patrón de **Modificar datos**: una CTE que inserta el pedido con `RETURNING id` y un `INSERT ... SELECT` que usa ese id para la línea.
:::

:::hint
Envuélvelo todo, junto con el `UPDATE` del stock, entre `BEGIN;` y `COMMIT;`. Sin el `COMMIT`, la corrección te avisará de que la transacción quedó abierta.
:::

:::solution
```sql
BEGIN;

WITH new_order AS (
  INSERT INTO orders (customer_id, order_date, status)
  VALUES (2, '2025-12-31', 'pending')
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT id, 5, 2, 19.99
FROM new_order;

UPDATE products
SET stock = stock - 2
WHERE id = 5;

COMMIT;
```
:::
::::

:::recap
- Una **transacción** agrupa sentencias en una unidad: se aplican todas o ninguna.
- En **autocommit**, cada sentencia suelta es su propia transacción.
- `BEGIN` abre una transacción, `COMMIT` la confirma y `ROLLBACK` la descarta.
- Dentro de la transacción ves tus cambios; los demás no los ven hasta el `COMMIT`.
- **ACID**: atomicidad, consistencia, aislamiento y durabilidad.

En el siguiente paso verás qué pasa cuando una sentencia falla dentro de una transacción.
:::
