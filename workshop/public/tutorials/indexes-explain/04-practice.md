## Objetivo del paso

En una aplicación real, los índices se deciden **a partir de las consultas**: qué filtra, qué une y qué ordena cada pantalla. Para cada reto, mira el `WHERE`, los `JOIN` y el `ORDER BY`, y aplica las reglas del tutorial: igualdad primero, rango u orden después.

## Retos

::::challenge La cola de pedidos pendientes
El almacén prepara los pedidos en orden de llegada. Su pantalla ejecuta:

```sql
SELECT id, customer_id, order_date
FROM orders
WHERE status = 'pending'
ORDER BY order_date
LIMIT 20;
```

Crea el índice adecuado. No borres los índices existentes.

```sql verify
SELECT string_agg(a.attname, ', ' ORDER BY k.ord) AS indexed_columns
FROM pg_index AS i
CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
WHERE i.indrelid = 'orders'::regclass
GROUP BY i.indexrelid;
```

:::hint
`status` se compara con igualdad y `order_date` se usa para ordenar.
:::

:::solution
```sql
CREATE INDEX orders_status_order_date_idx ON orders (status, order_date);
```
Un índice solo sobre `status` serviría poco: hay cinco estados y no evitaría ordenar. Combinado con `order_date`, el índice lleva directamente a los pendientes más antiguos. En la parte de PostgreSQL verás una alternativa aún más pequeña: un índice **parcial** solo sobre los pedidos pendientes.
:::
::::

::::challenge La página de una categoría
La página de cada categoría muestra sus productos activos del más barato al más caro:

```sql
SELECT id, name, price
FROM products
WHERE category_id = $1 AND is_active
ORDER BY price
LIMIT 24;
```

La tienda ya tiene un índice sobre `products (category_id)`. **Sustitúyelo** por uno que además evite ordenar (bórralo y crea el nuevo).

```sql verify
SELECT string_agg(a.attname, ', ' ORDER BY k.ord) AS indexed_columns
FROM pg_index AS i
CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
WHERE i.indrelid = 'products'::regclass
GROUP BY i.indexrelid;
```

:::hint
El índice actual se llama `products_category_id_idx`. Bórralo con `DROP INDEX`.
:::

:::hint
El nuevo: igualdad (`category_id`) primero y orden (`price`) después. `is_active` no hace falta en el índice: casi todos los productos están activos, así que no filtra casi nada.
:::

:::solution
```sql
DROP INDEX products_category_id_idx;

CREATE INDEX products_category_id_price_idx ON products (category_id, price);
```
El índice antiguo sobra: `(category_id, price)` sirve también para todo lo que servía `(category_id)`, incluida la clave foránea. Mantener los dos sería pagar dos veces en cada escritura.
:::
::::

::::challenge ¿Qué índices crearías?
Una aplicación de reservas de un hotel tiene la tabla `bookings (id, room_id, guest_id, check_in date, check_out date, status)`, con claves foráneas hacia `rooms` y `guests`. Sus consultas más frecuentes son:

1. Las reservas de un huésped, de la más reciente a la más antigua.
2. Las reservas de una habitación que se solapan con unas fechas: `WHERE room_id = $1 AND check_in < $3 AND check_out > $2`.
3. El informe mensual de todas las reservas por fecha de entrada: `WHERE check_in >= $1 AND check_in < $2`.

¿Qué índices crearías? ¿Alguno sobra si creas los demás?

:::hint
Aplica a cada consulta la regla de igualdad primero, rango u orden después. Y recuerda que las claves foráneas necesitan índice.
:::

:::solution
```sql example
CREATE INDEX bookings_guest_id_check_in_idx ON bookings (guest_id, check_in);
CREATE INDEX bookings_room_id_check_in_idx ON bookings (room_id, check_in);
CREATE INDEX bookings_check_in_idx ON bookings (check_in);
```

1. `(guest_id, check_in)`: igualdad por huésped y orden por fecha; recorrido hacia atrás para "de la más reciente". Además cubre la clave foránea `guest_id`.
2. `(room_id, check_in)`: igualdad por habitación y rango sobre `check_in`; la condición sobre `check_out` se comprueba sobre las pocas filas que quedan. Cubre la clave foránea `room_id`.
3. `(check_in)`: el rango del informe no tiene ninguna igualdad delante, así que necesita un índice que empiece por `check_in`.

No hace falta un índice aparte para `guest_id` ni para `room_id`: los compuestos empiezan por ellos. Y `status`, solo, probablemente no merezca índice: tiene pocos valores distintos.
:::
::::

:::recap
En este tutorial has aprendido a pensar en índices:

- Un índice guarda valores ordenados; PostgreSQL crea solos los de las claves primarias y los `UNIQUE`.
- `EXPLAIN` y `EXPLAIN ANALYZE` muestran cómo se ejecuta una consulta; las páginas leídas son la medida más fiable.
- El planificador elige por coste: un índice solo ayuda en condiciones selectivas.
- En un índice de varias columnas importa el orden: igualdad primero, rango u orden después; puede evitar ordenar.
- Cada índice cuesta en escrituras y espacio: crea los que tus consultas necesitan y borra los redundantes.

Con este tutorial terminas el nivel **Intermedio**. En el nivel **Avanzado** empieza la parte de PostgreSQL: sus tipos de datos, `RETURNING` y `ON CONFLICT`, parámetros y SQL injection, funciones de ventana, `JSONB` y más.
:::
