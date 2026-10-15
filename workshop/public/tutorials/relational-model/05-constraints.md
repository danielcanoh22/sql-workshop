## Objetivo del paso

Ya viste dos reglas que la base de datos hace cumplir: la clave primaria y la clave foránea. Hay más, y juntas son la **última línea de defensa** de tus datos. En este paso aprendes:

1. `NOT NULL`: datos obligatorios.
2. `UNIQUE`: datos que no se pueden repetir.
3. `CHECK`: reglas de negocio sobre los valores.
4. `DEFAULT`: valores por defecto.

## `NOT NULL`: datos obligatorios

`NULL` significa "sin valor". Una columna `NOT NULL` lo prohíbe. En `customers`, el apellido es obligatorio; la ciudad no (en el panel **Datos**, las columnas que admiten `NULL` llevan esa marca):

```sql run error title="Un cliente sin apellido"
INSERT INTO customers (first_name, email, country, signup_date)
VALUES ('Leo', 'leo@example.com', 'Chile', '2025-03-01');
```

`null value in column "last_name" ... violates not-null constraint`. Como no indicaste `last_name`, habría quedado vacío, y la base de datos no lo permite.

## `UNIQUE`: datos que no se repiten

Dos clientes no pueden compartir email (es su usuario para entrar en la tienda):

```sql run error title="Un email que ya existe"
INSERT INTO customers (first_name, last_name, email, country, signup_date)
VALUES ('Ana', 'Otra', 'ana.garcia@example.com', 'España', '2025-03-01');
```

:::concept UNIQUE frente a la comprobación en la aplicación
Es tentador comprobarlo en la aplicación: "busco si el email existe y, si no, lo inserto". Pero entre la búsqueda y la inserción otra petición puede registrar el mismo email (dos clics seguidos en "Crear cuenta" bastan). Solo la restricción `UNIQUE` lo garantiza **siempre**, porque la comprobación y la escritura ocurren dentro de la base de datos, de forma atómica. La aplicación puede (y debe) validar para dar un mensaje amable, pero la garantía la da la base de datos.
:::

## `CHECK`: reglas de negocio

`CHECK` añade una condición que todas las filas deben cumplir. En la tienda:

```sql
price numeric(10, 2) NOT NULL CHECK (price >= 0),
status text NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled'))
```

```sql run error title="Un precio negativo"
INSERT INTO products (name, category_id, price, stock)
VALUES ('Lápiz', 1, -5, 10);
```

```sql run error title="Un estado que no existe"
INSERT INTO orders (customer_id, order_date, status)
VALUES (1, '2025-05-01', 'lost');
```

## `DEFAULT`: valores por defecto

Si al insertar no indicas una columna, toma su valor por defecto. `is_active` es `DEFAULT true`, así que un cliente nuevo está activo salvo que digas lo contrario:

```sql run title="Un cliente nuevo, activo por defecto"
INSERT INTO customers (first_name, last_name, email, country, signup_date)
VALUES ('Leo', 'Paz', 'leo.paz@example.com', 'Chile', '2025-03-01')
RETURNING id, first_name, is_active;
```

Esta vez no hay error: el cliente se crea con el `id` siguiente y `is_active = true`. Míralo en el panel **Datos** (la tabla `customers` ahora tiene 31 filas) y usa **Restablecer** cuando quieras volver a los datos originales.

:::tip Defensa en profundidad
Las restricciones no sustituyen a la validación de la aplicación: la complementan. La aplicación valida para dar buenos mensajes al usuario ("ese email ya está registrado"); la base de datos garantiza que, pase lo que pase, **los datos guardados nunca violan las reglas**.
:::

## Retos

::::challenge Arregla el INSERT
Este `INSERT` intenta añadir un **Cuaderno** a la categoría **Libros** (id 2), pero tiene dos errores que la base de datos rechaza. Ejecútalo para ver el primero, corrígelo y repite hasta que funcione. El cuaderno cuesta **3.50** y hay **100** unidades.

```sql starter
INSERT INTO products (name, category_id, price)
VALUES ('Cuaderno', 2, -3.50);
```

```sql verify
SELECT name, category_id, price, stock, is_active
FROM products
WHERE name = 'Cuaderno';
```

:::hint
Una columna obligatoria no aparece en la lista de columnas.
:::

:::hint
Falta `stock` (es `NOT NULL` y no tiene valor por defecto), y el precio no cumple el `CHECK`. Añade `stock` a la lista de columnas y su valor a `VALUES`, en el mismo orden.
:::

:::solution
```sql
INSERT INTO products (name, category_id, price, stock)
VALUES ('Cuaderno', 2, 3.50, 100);
```
La corrección comprueba la fila que queda en la tabla. `is_active` no aparece en el `INSERT`, así que toma su valor por defecto, `true`.
:::
::::

::::challenge ¿Qué restricción usarías?
Para cada regla de negocio, elige la restricción que la garantiza: `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT` o una clave foránea.

1. Todo pedido tiene una fecha.
2. No puede haber dos productos con el mismo código de barras.
3. La cantidad de una línea de pedido es al menos 1.
4. Si no se indica, un pedido nuevo está en estado `'pending'`.
5. Una reseña solo puede ser de un producto que existe.

:::hint
Una de las reglas trata de otra tabla.
:::

:::solution
1. `NOT NULL` en `order_date`.
2. `UNIQUE` en `barcode`.
3. `CHECK (quantity > 0)`. La tabla `order_items` de la tienda ya la tiene.
4. `DEFAULT 'pending'` en `status`.
5. Una clave foránea: `product_id REFERENCES products (id)`.
:::
::::

:::recap
- `NOT NULL` hace obligatorio un dato; `UNIQUE` impide repetidos; `CHECK` impone reglas sobre los valores; `DEFAULT` da un valor cuando no se indica.
- Junto con las claves primarias y foráneas, garantizan que los datos guardados **siempre** cumplen las reglas.
- La aplicación valida para dar buenos mensajes; la base de datos garantiza la integridad, incluso ante peticiones simultáneas.

Ya conoces cómo están organizados los datos de la tienda. En el siguiente tutorial, **SELECT y WHERE**, aprenderás a consultarlos de verdad.
:::
