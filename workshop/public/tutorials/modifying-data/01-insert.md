## Objetivo del paso

`INSERT` añade filas a una tabla. En este paso aprendes:

1. La forma correcta de escribir un `INSERT` (y por qué siempre se nombran las columnas).
2. A insertar varias filas a la vez.
3. Qué pasa con las columnas que no indicas.
4. A ver lo insertado con `RETURNING` y a copiar datos con `INSERT ... SELECT`.

## La forma de un `INSERT`

```sql
INSERT INTO tabla (columna1, columna2)
VALUES (valor1, valor2);
```

Los valores van **en el mismo orden** que las columnas. Añade una categoría:

```sql run title="Una categoría nueva"
INSERT INTO categories (name)
VALUES ('Mascotas');
```

Abre el panel **Datos**: `categories` tiene ahora 7 filas. El `id` lo generó la base de datos (es una columna `GENERATED ... AS IDENTITY`), por eso no lo indicaste.

## Nombra siempre las columnas

SQL permite omitir la lista de columnas, y entonces los valores se asignan **en el orden en que se crearon las columnas de la tabla**:

```sql run error title="Sin lista de columnas"
INSERT INTO categories
VALUES ('Mascotas');
```

La primera columna de `categories` es `id`, así que PostgreSQL intenta guardar `'Mascotas'` en un entero. Aquí da un error, que es lo mejor que puede pasar; si los tipos encajaran, **guardaría los datos en las columnas equivocadas sin avisar**. Y si mañana alguien añade una columna a la tabla, todos los `INSERT` sin lista se rompen.

:::tip Regla
Escribe **siempre** la lista de columnas en un `INSERT`. Es más largo, pero no depende del orden de las columnas ni se rompe cuando la tabla cambia.
:::

## Varias filas a la vez

Separa los grupos de valores con comas:

```sql run title="Dos productos en una sola sentencia"
INSERT INTO products (name, category_id, price, stock)
VALUES ('Cometa', 6, 14.90, 40),
       ('Yoyó', 6, 4.50, 100);
```

Una sentencia con muchas filas es mucho más eficiente que muchas sentencias de una fila: un solo viaje a la base de datos y una sola transacción.

## Las columnas que no indicas

Si no das valor a una columna, toma su **valor por defecto** (`DEFAULT`) o, si no tiene, `NULL`. En el `INSERT` anterior no indicaste `is_active`, así que vale `true` (su `DEFAULT`). Si una columna es `NOT NULL` y no tiene valor por defecto, omitirla es un error, como viste en **El modelo relacional**.

## `RETURNING`: ver lo que se insertó

La aplicación casi siempre necesita el `id` de la fila que acaba de crear (para redirigir a su ficha, por ejemplo). `RETURNING` lo devuelve en la misma sentencia:

```sql run title="Insertar y obtener el id"
INSERT INTO customers (first_name, last_name, email, country, signup_date)
VALUES ('Leo', 'Paz', 'leo.paz@example.com', 'Chile', '2025-03-01')
RETURNING id, first_name, is_active;
```

`RETURNING` es una extensión de PostgreSQL muy útil; la verás a fondo en la parte de PostgreSQL.

## `INSERT ... SELECT`: insertar el resultado de una consulta

En lugar de `VALUES`, un `INSERT` puede recibir las filas de un `SELECT`. Por ejemplo, crear un pedido pendiente de bienvenida para cada cliente que nunca compró:

```sql run title="Un pedido para cada cliente sin pedidos"
INSERT INTO orders (customer_id, order_date, status)
SELECT c.id, DATE '2025-12-31', 'pending'
FROM customers AS c
WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)
RETURNING id, customer_id;
```

Las columnas del `SELECT` se asignan, en orden, a las columnas de la lista del `INSERT`.

## Retos

::::challenge Una categoría nueva
Añade la categoría **Papelería**.

```sql verify
SELECT name
FROM categories;
```

:::solution
```sql
INSERT INTO categories (name)
VALUES ('Papelería');
```
La corrección comprueba el contenido de la tabla después de tu `INSERT`, no el resultado de la sentencia.
:::
::::

::::challenge Nuevos juguetes
Añade en una sola sentencia dos productos a la categoría **Juguetes** (id 6): una **Cometa** de **14.90** con **40** unidades y un **Yoyó** de **4.50** con **100** unidades.

```sql verify
SELECT name, category_id, price, stock, is_active
FROM products
WHERE category_id = 6;
```

:::hint
Un solo `INSERT` con dos grupos de valores separados por coma. Las columnas son `name`, `category_id`, `price` y `stock`.
:::

:::solution
```sql
INSERT INTO products (name, category_id, price, stock)
VALUES ('Cometa', 6, 14.90, 40),
       ('Yoyó', 6, 4.50, 100);
```
:::
::::

::::challenge Copiar con INSERT ... SELECT
La tienda quiere regalar un **Peluche oso** (producto 29) en cada pedido **pendiente**. Inserta, en una sola sentencia, una línea en `order_items` por cada pedido pendiente, con el producto **29**, cantidad **1** y precio unitario **0**.

```sql verify
SELECT order_id, product_id, quantity, unit_price
FROM order_items
WHERE product_id = 29;
```

:::hint
`INSERT INTO order_items (order_id, product_id, quantity, unit_price) SELECT ...`, donde el `SELECT` recorre los pedidos con `status = 'pending'`.
:::

:::hint
El `SELECT` puede devolver valores fijos además de columnas: `SELECT id, 29, 1, 0 FROM orders WHERE ...`.
:::

:::solution
```sql
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT id, 29, 1, 0
FROM orders
WHERE status = 'pending';
```
Una sola sentencia inserta 18 líneas, una por pedido pendiente. `unit_price` es 0 porque es un regalo: la restricción `CHECK (unit_price >= 0)` lo permite.
:::
::::

:::recap
- `INSERT INTO tabla (columnas) VALUES (...)`: **nombra siempre las columnas**.
- Varias filas en una sentencia: grupos de valores separados por comas.
- Las columnas omitidas toman su `DEFAULT` o `NULL`.
- `RETURNING` devuelve lo insertado (por ejemplo, el `id` generado).
- `INSERT ... SELECT` inserta el resultado de una consulta.

En el siguiente paso modificarás filas que ya existen con `UPDATE`.
:::
