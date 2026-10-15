## Objetivo del paso

`DELETE` borra filas, y un borrado no se puede deshacer. En este paso aprendes:

1. A borrar filas con `DELETE ... WHERE`.
2. Qué pasa cuando otras filas dependen de las que borras.
3. Cuándo es mejor **no borrar** y marcar la fila como inactiva (borrado lógico).

## La forma de un `DELETE`

```sql
DELETE FROM tabla
WHERE condición;
```

Como con `UPDATE`, **sin `WHERE` se borra toda la tabla**. Todo lo que aprendiste en el paso anterior (primero un `SELECT` con el mismo `WHERE`, mirar el número de filas afectadas) vale igual aquí.

Para practicar sin tocar datos importantes, crea primero tres clientes de prueba:

```sql run title="Crear clientes de prueba"
INSERT INTO customers (first_name, last_name, email, country, signup_date)
VALUES ('Prueba', 'Uno', 'uno@test.local', 'España', '2025-06-01'),
       ('Prueba', 'Dos', 'dos@test.local', 'España', '2025-06-01'),
       ('Prueba', 'Tres', 'tres@test.local', 'España', '2025-06-01');
```

Y ahora bórralos. `RETURNING` muestra exactamente qué se borró:

```sql run title="Borrar los clientes de prueba"
DELETE FROM customers
WHERE email LIKE '%@test.local'
RETURNING id, email;
```

## Filas de las que dependen otras

Intenta borrar los pedidos cancelados:

```sql run error title="Borrar pedidos que tienen líneas"
DELETE FROM orders
WHERE status = 'cancelled';
```

`violates foreign key constraint "order_items_order_id_fkey"`: esos pedidos tienen líneas en `order_items` que apuntan a ellos, y la clave foránea impide dejarlas huérfanas. Hay que borrar primero las filas **hijas** y después las **padres**:

```sql run title="Primero las líneas, después los pedidos"
DELETE FROM order_items
WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled');

DELETE FROM orders
WHERE status = 'cancelled';
```

Las dos sentencias del bloque se ejecutan **juntas, como una unidad**: si la segunda fallara, la primera tampoco se aplicaría. Lo entenderás a fondo en el tutorial de **Transacciones**.

:::tip ON DELETE CASCADE
Una clave foránea puede declararse con `ON DELETE CASCADE` para que, al borrar la fila padre, se borren solas sus hijas. Es cómodo para datos que no tienen sentido sin su padre (las líneas de un pedido), pero peligroso en general: un `DELETE` de un cliente podría arrastrar, en cascada, pedidos, líneas, pagos y facturas. Lo verás en el tutorial de tablas y restricciones.
:::

## Borrar o no borrar

En una aplicación real, **casi nunca se borran** clientes, productos o pedidos:

- Los pedidos de un cliente borrado se quedarían sin dueño (o habría que borrarlos también, y con ellos el historial de ventas).
- La contabilidad, las facturas y los informes necesitan los datos históricos.
- Un borrado por error no tiene vuelta atrás.

La alternativa es el **borrado lógico** (*soft delete*): una columna que marca la fila como dada de baja. En la tienda, `customers.is_active` y `products.is_active` cumplen ese papel: un producto retirado no se muestra en el catálogo, pero sus ventas pasadas siguen intactas.

```sql run title="Dar de baja un producto sin borrarlo"
UPDATE products
SET is_active = false
WHERE id = 5
RETURNING name, is_active;
```

:::why ¿Entonces para qué sirve DELETE?
Para datos que de verdad sobran: registros de prueba, sesiones caducadas, borradores, datos temporales, o datos personales que la ley obliga a eliminar. La pregunta que hay que hacerse es: ¿alguien va a necesitar este dato en el futuro? Si la respuesta es "quizá", márcalo en lugar de borrarlo.
:::

:::postgres TRUNCATE
Para vaciar una tabla entera, `TRUNCATE tabla` es mucho más rápido que `DELETE FROM tabla`, porque no borra fila a fila. Se usa en procesos de carga o en tests, casi nunca en el código de una aplicación.
:::

## Retos

::::challenge Limpiar los clientes de prueba
La corrección crea los tres clientes de prueba con email `@test.local` antes de tu respuesta. Bórralos sin tocar a ningún otro cliente.

```sql setup
INSERT INTO customers (first_name, last_name, email, country, signup_date)
VALUES ('Prueba', 'Uno', 'uno@test.local', 'España', '2025-06-01'),
       ('Prueba', 'Dos', 'dos@test.local', 'España', '2025-06-01'),
       ('Prueba', 'Tres', 'tres@test.local', 'España', '2025-06-01');
```

```sql verify
SELECT email
FROM customers;
```

:::hint
Un `LIKE` con el comodín `%` delante del dominio.
:::

:::solution
```sql
DELETE FROM customers
WHERE email LIKE '%@test.local';
```
:::
::::

::::challenge Borrar los pedidos cancelados
Borra los pedidos **cancelados** y sus líneas de pedido.

```sql verify
SELECT
  (SELECT count(*) FROM orders) AS orders,
  (SELECT count(*) FROM order_items) AS order_items,
  (SELECT count(*) FROM orders WHERE status = 'cancelled') AS cancelled;
```

:::hint
Si borras primero los pedidos, la clave foránea de `order_items` lo impide.
:::

:::hint
Dos sentencias: primero `DELETE FROM order_items WHERE order_id IN (...)`, después `DELETE FROM orders WHERE ...`.
:::

:::solution
```sql
DELETE FROM order_items
WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled');

DELETE FROM orders
WHERE status = 'cancelled';
```
Quedan 81 pedidos y 162 líneas. En una tienda real no harías esto: los pedidos cancelados forman parte del historial.
:::
::::

::::challenge Baja lógica
En lugar de borrar a la clienta con email **ana.garcia@example.com**, dala de baja: márcala como **inactiva**.

```sql verify
SELECT email, is_active
FROM customers;
```

:::solution
```sql
UPDATE customers
SET is_active = false
WHERE email = 'ana.garcia@example.com';
```
Ana tiene tres pedidos: un `DELETE` fallaría por la clave foránea (o, con `ON DELETE CASCADE`, borraría su historial). La baja lógica conserva todo y la oculta de donde haga falta.
:::
::::

:::recap
- `DELETE FROM tabla WHERE condición`: **nunca sin `WHERE`**, y primero comprueba con un `SELECT`.
- Las claves foráneas impiden borrar filas de las que dependen otras: borra primero las hijas y después las padres.
- `ON DELETE CASCADE` borra las hijas automáticamente: úsalo con cuidado.
- En aplicaciones, prefiere el **borrado lógico** (`is_active = false`) para datos con historia.

En el último paso combinarás `INSERT`, `UPDATE` y `DELETE` en tareas reales de la tienda.
:::
