## Objetivo del paso

La tienda quiere lanzar **cupones de descuento**. Vas a crear la tabla con todas sus reglas de negocio y a conectarla con los pedidos. Lee los requisitos con calma: cada regla se convierte en una restricción.

## Retos

::::challenge Tabla de cupones
Crea la tabla `coupons` con estas columnas (y solo estas) y reglas:

- `id`: clave primaria generada.
- `code`: texto obligatorio. **No puede haber dos cupones con el mismo código.**
- `discount_percent`: entero obligatorio, **entre 1 y 90**.
- `valid_from` y `valid_until`: fechas obligatorias. **`valid_until` tiene que ser posterior a `valid_from`.**
- `is_active`: booleano obligatorio, **activo por defecto**.

```sql verify
SELECT 'columna ' || column_name AS item,
       data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END AS outcome
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coupons'
UNION ALL
SELECT 'cupón válido', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('VERANO', 10, '2025-06-01', '2025-08-31')$$)
UNION ALL
SELECT 'activo por defecto', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('VERANO', 10, '2025-06-01', '2025-08-31')$$, $$SELECT is_active::text FROM coupons WHERE code = 'VERANO'$$)
UNION ALL
SELECT 'código repetido', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('VERANO', 10, '2025-06-01', '2025-08-31'), ('VERANO', 20, '2025-06-01', '2025-08-31')$$)
UNION ALL
SELECT 'descuento del 0 %', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('CERO', 0, '2025-06-01', '2025-08-31')$$)
UNION ALL
SELECT 'descuento del 90 %', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('CASI', 90, '2025-06-01', '2025-08-31')$$)
UNION ALL
SELECT 'descuento del 91 %', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('DEMASIADO', 91, '2025-06-01', '2025-08-31')$$)
UNION ALL
SELECT 'termina antes de empezar', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('AL-REVES', 10, '2025-08-31', '2025-06-01')$$)
UNION ALL
SELECT 'empieza y termina el mismo día', workshop.try($$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('UN-DIA', 10, '2025-06-01', '2025-06-01')$$);
```

:::hint
Hay una restricción por cada frase en negrita. La de las fechas compara dos columnas, así que va después de las columnas.
:::

:::hint
"Posterior" significa estrictamente mayor: `CHECK (valid_until > valid_from)`. "Entre 1 y 90" incluye los extremos: `BETWEEN 1 AND 90`.
:::

:::solution
```sql
CREATE TABLE coupons (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 90),
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT coupons_validity_check CHECK (valid_until > valid_from)
);
```
Fíjate en los casos límite que comprueba la corrección: 90 % se acepta y 91 % no; un cupón de un solo día (`valid_until = valid_from`) se rechaza porque "posterior" es estricto. Los límites son donde más errores se cometen al traducir una regla de negocio.
:::
::::

::::challenge Pedidos con cupón
Los pedidos pueden usar **un cupón como mucho**. Crea la tabla `coupons` como en el reto anterior (puedes copiar tu solución) y añade a `orders` una columna **opcional** `coupon_id` que lo referencie. Si un cupón se borra, los pedidos que lo usaron deben **conservarse**, simplemente sin cupón. Crea también un índice sobre la nueva columna.

```sql verify
SELECT 'columna coupon_id' AS item,
       (SELECT data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'coupon_id') AS outcome
UNION ALL
SELECT 'pedido con cupón inexistente', workshop.try($$UPDATE orders SET coupon_id = 999 WHERE id = 1$$)
UNION ALL
SELECT 'pedido sin cupón', workshop.try($$INSERT INTO orders (customer_id, order_date, status) VALUES (1, '2025-12-31', 'pending')$$)
UNION ALL
SELECT 'cupón de un pedido tras borrar el cupón', workshop.try(
  $$INSERT INTO coupons (code, discount_percent, valid_from, valid_until) VALUES ('BORRAR', 10, '2025-01-01', '2025-12-31');
    UPDATE orders SET coupon_id = (SELECT id FROM coupons WHERE code = 'BORRAR') WHERE id = 1;
    DELETE FROM coupons WHERE code = 'BORRAR'$$,
  $$SELECT coalesce(coupon_id::text, 'sin cupón') FROM orders WHERE id = 1$$)
UNION ALL
SELECT 'índice sobre coupon_id', (
  SELECT count(*)::text
  FROM pg_index AS i
  JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
  WHERE i.indrelid = 'orders'::regclass AND a.attname = 'coupon_id'
);
```

:::hint
`ALTER TABLE orders ADD COLUMN coupon_id integer REFERENCES coupons (id) ON DELETE ...`. ¿Qué opción deja la clave foránea a `NULL`?
:::

:::hint
Después, `CREATE INDEX orders_coupon_id_idx ON orders (coupon_id);`.
:::

:::solution
```sql
CREATE TABLE coupons (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 90),
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT coupons_validity_check CHECK (valid_until > valid_from)
);

ALTER TABLE orders
ADD COLUMN coupon_id integer REFERENCES coupons (id) ON DELETE SET NULL;

CREATE INDEX orders_coupon_id_idx ON orders (coupon_id);
```
`ON DELETE SET NULL` encaja porque la relación es **opcional**: un pedido sin cupón es perfectamente válido. En la práctica, un cupón usado no se borraría (se desactivaría con `is_active = false`), pero la regla garantiza que, si alguien lo borra, los pedidos no se pierden ni quedan apuntando a nada.
:::
::::

:::recap
En este tutorial has aprendido a crear y proteger tus propias tablas:

- `CREATE TABLE` con `GENERATED ... AS IDENTITY`, tipos adecuados y `DEFAULT`.
- Cada regla de negocio se convierte en una restricción: `NOT NULL`, `UNIQUE` (también sobre varias columnas), `CHECK` (también entre columnas) y claves foráneas.
- Con `ON DELETE` decides qué pasa con las filas hijas: error, `CASCADE` o `SET NULL`.
- `ALTER TABLE` cambia tablas con datos; las restricciones nuevas se comprueban contra los datos existentes.
- Los cambios de esquema de una aplicación se gestionan como **migraciones**.

En el siguiente tutorial darás un paso atrás: antes de escribir `CREATE TABLE`, aprenderás a decidir **qué tablas** necesita una aplicación.
:::
