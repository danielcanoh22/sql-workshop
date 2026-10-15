## Objetivo del paso

En **El modelo relacional** viste cómo la base de datos rechaza datos incorrectos. Ahora vas a escribir esas reglas tú. En este paso aprendes a declarar:

1. `UNIQUE`, de una columna o de una combinación de columnas.
2. `CHECK`, sobre una columna o comparando varias.
3. Claves foráneas, y qué hacer con las filas hijas cuando se borra la padre (`ON DELETE`).
4. Restricciones con nombre, para que los errores se entiendan.

## `UNIQUE`

En una columna, impide valores repetidos. Sobre **varias** columnas, impide que se repita la **combinación**:

```sql run title="Una reseña por cliente y producto"
CREATE TABLE reviews (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products (id),
  customer_id integer NOT NULL REFERENCES customers (id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, customer_id)
);
```

`UNIQUE (product_id, customer_id)` permite que un cliente reseñe muchos productos y que un producto tenga muchas reseñas, pero **no** que el mismo cliente reseñe dos veces el mismo producto:

```sql run title="La primera reseña"
INSERT INTO reviews (product_id, customer_id, rating, comment)
VALUES (1, 1, 5, 'Suenan genial');
```

```sql run error title="La segunda reseña del mismo cliente al mismo producto"
INSERT INTO reviews (product_id, customer_id, rating)
VALUES (1, 1, 4);
```

:::postgres UNIQUE y NULL
Una columna `UNIQUE` admite **varios** `NULL`: como `NULL` significa "desconocido", PostgreSQL no considera que dos `NULL` sean iguales. Si quieres que solo pueda haber uno, desde PostgreSQL 15 puedes escribir `UNIQUE NULLS NOT DISTINCT`.
:::

## `CHECK`

Una condición que toda fila debe cumplir. Puede usar una columna (`rating BETWEEN 1 AND 5`) o comparar varias. Para eso se escribe aparte, después de las columnas:

```sql run title="Una promoción con fechas coherentes"
CREATE TABLE promotions (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  CONSTRAINT promotions_dates_check CHECK (ends_on > starts_on)
);
```

```sql run error title="Una promoción que termina antes de empezar"
INSERT INTO promotions (name, starts_on, ends_on)
VALUES ('Verano', '2025-08-31', '2025-06-01');
```

:::tip Pon nombre a tus restricciones
`CONSTRAINT promotions_dates_check CHECK (...)` le da un nombre a la restricción. Ese nombre aparece en el mensaje de error, así que la aplicación puede reconocerlo y traducirlo a un mensaje claro para el usuario ("la fecha de fin debe ser posterior a la de inicio"). Si no le pones nombre, PostgreSQL inventa uno.
:::

## Claves foráneas y `ON DELETE`

`REFERENCES products (id)` crea una clave foránea. Lo importante es decidir **qué pasa con las filas hijas cuando se borra la padre**:

| Opción | Al borrar la fila padre… | Úsala cuando… |
| --- | --- | --- |
| *(sin indicar)* / `RESTRICT` | Error si tiene hijas | Las hijas son importantes (pedidos de un cliente) |
| `CASCADE` | Se borran también las hijas | Las hijas no tienen sentido sin la padre (los artículos de una lista de deseos) |
| `SET NULL` | La clave foránea de las hijas pasa a `NULL` | La relación es opcional (un pedido que usó un cupón que ya no existe) |

```sql run title="Una lista de deseos que se borra con su cliente"
CREATE TABLE wishlist_items (
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

CREATE INDEX wishlist_items_product_id_idx ON wishlist_items (product_id);
```

Fíjate en el índice: la clave primaria `(customer_id, product_id)` ya sirve para buscar por `customer_id` (es su primera columna), pero no por `product_id`. Como aprendiste en **JOINs**, las claves foráneas necesitan un índice.

```sql run title="Borrar un cliente borra su lista de deseos"
INSERT INTO wishlist_items (customer_id, product_id)
VALUES (30, 20), (30, 4);

DELETE FROM customers
WHERE id = 30;

SELECT count(*) AS items_left
FROM wishlist_items
WHERE customer_id = 30;
```

## Retos

::::challenge Reseñas de productos
Crea la tabla `reviews` con estas columnas (y solo estas):

- `id`: clave primaria generada.
- `product_id`: obligatorio, referencia a `products`.
- `customer_id`: obligatorio, referencia a `customers`.
- `rating`: entero obligatorio entre **1 y 5**.
- `comment`: texto opcional.
- Un cliente solo puede reseñar **una vez** cada producto.

```sql verify
SELECT 'columna ' || column_name AS item,
       data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END AS outcome
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reviews'
UNION ALL
SELECT 'reseña válida', workshop.try($$INSERT INTO reviews (product_id, customer_id, rating) VALUES (1, 1, 5)$$)
UNION ALL
SELECT 'valoración 0', workshop.try($$INSERT INTO reviews (product_id, customer_id, rating) VALUES (1, 1, 0)$$)
UNION ALL
SELECT 'valoración 6', workshop.try($$INSERT INTO reviews (product_id, customer_id, rating) VALUES (1, 1, 6)$$)
UNION ALL
SELECT 'producto inexistente', workshop.try($$INSERT INTO reviews (product_id, customer_id, rating) VALUES (999, 1, 5)$$)
UNION ALL
SELECT 'cliente inexistente', workshop.try($$INSERT INTO reviews (product_id, customer_id, rating) VALUES (1, 999, 5)$$)
UNION ALL
SELECT 'segunda reseña', workshop.try($$INSERT INTO reviews (product_id, customer_id, rating) VALUES (1, 1, 5); INSERT INTO reviews (product_id, customer_id, rating) VALUES (1, 1, 3)$$)
UNION ALL
SELECT 'otro producto, mismo cliente', workshop.try($$INSERT INTO reviews (product_id, customer_id, rating) VALUES (1, 1, 5); INSERT INTO reviews (product_id, customer_id, rating) VALUES (2, 1, 3)$$);
```

:::hint
Las claves foráneas se declaran en la propia columna: `product_id integer NOT NULL REFERENCES products (id)`.
:::

:::hint
La regla de "una vez por producto" es un `UNIQUE` sobre la **combinación** de dos columnas, escrito después de las columnas.
:::

:::solution
```sql
CREATE TABLE reviews (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products (id),
  customer_id integer NOT NULL REFERENCES customers (id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  UNIQUE (product_id, customer_id)
);
```
En una base de datos real añadirías también un índice sobre `customer_id` (el `UNIQUE` crea uno sobre `(product_id, customer_id)`, que sirve para buscar por `product_id`, pero no por `customer_id`).
:::
::::

::::challenge Lista de deseos
Crea la tabla `wishlist_items` con estas columnas (y solo estas):

- `customer_id`: obligatorio, referencia a `customers`. Si se borra el cliente, **se borran sus artículos** de la lista.
- `product_id`: obligatorio, referencia a `products`. Un producto que está en alguna lista **no se puede borrar**.
- La clave primaria es la combinación de `customer_id` y `product_id`.

```sql verify
SELECT 'columna ' || column_name AS item,
       data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END AS outcome
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'wishlist_items'
UNION ALL
SELECT 'añadir un producto', workshop.try($$INSERT INTO wishlist_items (customer_id, product_id) VALUES (30, 20)$$)
UNION ALL
SELECT 'añadirlo dos veces', workshop.try($$INSERT INTO wishlist_items (customer_id, product_id) VALUES (30, 20), (30, 20)$$)
UNION ALL
SELECT 'artículos tras borrar al cliente', workshop.try($$INSERT INTO wishlist_items (customer_id, product_id) VALUES (30, 20); DELETE FROM customers WHERE id = 30$$, $$SELECT count(*)::text FROM wishlist_items WHERE customer_id = 30$$)
UNION ALL
SELECT 'borrar un producto deseado', workshop.try($$INSERT INTO wishlist_items (customer_id, product_id) VALUES (30, 29); DELETE FROM products WHERE id = 29$$);
```

:::hint
`ON DELETE CASCADE` va justo después del `REFERENCES` de `customer_id`. Para `product_id` no hace falta nada: el comportamiento por defecto ya impide el borrado.
:::

:::solution
```sql
CREATE TABLE wishlist_items (
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id),
  PRIMARY KEY (customer_id, product_id)
);

CREATE INDEX wishlist_items_product_id_idx ON wishlist_items (product_id);
```
El índice no lo comprueba la corrección, pero es parte de hacerlo bien: sin él, borrar un producto obligaría a recorrer todas las listas de deseos.
:::
::::

:::recap
- `UNIQUE` sobre varias columnas impide que se repita la **combinación**; admite varios `NULL`.
- `CHECK` puede comparar columnas entre sí; ponle nombre con `CONSTRAINT nombre`.
- Al declarar una clave foránea decide qué pasa al borrar la padre: error (por defecto), `CASCADE` o `SET NULL`.
- Crea un índice para cada clave foránea que no sea la primera columna de otro índice.

En el siguiente paso cambiarás tablas que ya tienen datos con `ALTER TABLE`.
:::
