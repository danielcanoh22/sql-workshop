## Objetivo del paso

Vas a entender qué es un índice antes de crear ninguno. Al terminar sabrás:

1. Qué hace PostgreSQL sin índice, y qué hace con uno.
2. Qué índices existen ya en la tienda y quién los creó.
3. Crear y borrar índices.
4. Qué cuesta un índice.

## Sin índice: leer todo

Para encontrar a los clientes con apellido `'Prueba 4242'` en una tabla sin índice sobre `last_name`, PostgreSQL no tiene otra opción que **leer todas las filas** y comprobar cada una. Es un *Seq Scan* (lectura secuencial). Con 30 filas es instantáneo; con millones, no.

:::concept Un índice es el índice de un libro
Un índice es una estructura aparte que guarda los valores de una columna **ordenados**, cada uno con la ubicación de su fila. Igual que el índice alfabético de un libro te lleva directamente a la página, PostgreSQL busca el valor en el índice (sin recorrerlo entero, porque está ordenado) y salta a la fila. El tipo de índice por defecto es el **B-tree**, un árbol que mantiene los valores ordenados y equilibrados.
:::

## Los índices que ya existen

PostgreSQL crea un índice automáticamente para cada **clave primaria** y cada restricción **`UNIQUE`** (los necesita para comprobar que no hay repetidos). Los demás los crea quien diseña el esquema:

```sql run title="Los índices de la tienda"
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

- `..._pkey` y `customers_email_key`: automáticos, por la clave primaria y el `UNIQUE`.
- `orders_customer_id_idx`, `order_items_product_id_idx` y `products_category_id_idx`: creados a mano en el dataset, porque las **claves foráneas no se indexan solas**.

## Crear y borrar un índice

```sql
CREATE INDEX customers_last_name_idx ON customers (last_name);

DROP INDEX customers_last_name_idx;
```

El nombre es libre; la convención habitual es `tabla_columnas_idx`.

:::compare Buscar clientes por apellido
La comparación añade 100 000 clientes y busca uno por su apellido, sin índice y con él.

```sql setup
INSERT INTO customers (id, first_name, last_name, email, country, signup_date)
SELECT 1000 + g, 'Cliente', 'Prueba ' || g, 'prueba' || g || '@example.com', 'España', DATE '2024-01-01'
FROM generate_series(1, 100000) AS g;
ANALYZE customers;
```

```sql variant label="Sin índice"
SELECT id, first_name, last_name
FROM customers
WHERE last_name = 'Prueba 4242';
```
PostgreSQL lee las 100 030 filas (*Seq Scan*) para devolver una.

```sql variant-setup
CREATE INDEX customers_last_name_idx ON customers (last_name);
```
```sql variant label="Con índice sobre last_name" best
SELECT id, first_name, last_name
FROM customers
WHERE last_name = 'Prueba 4242';
```
La misma consulta, sin cambiar una coma: con el índice, PostgreSQL busca `'Prueba 4242'` en el árbol y va directo a la fila. Fíjate en que no hace falta "usar" el índice en la consulta: el planificador decide solo.
:::

## Lo que cuesta un índice

Un índice no es gratis:

- **Espacio**: es una copia ordenada de la columna, con punteros a las filas.
- **Escrituras más lentas**: cada `INSERT`, cada `UPDATE` de la columna indexada y cada `DELETE` tienen que actualizar también el índice. Una tabla con diez índices hace once escrituras por cada fila nueva.

```sql run title="El tamaño de una tabla y de sus índices"
SELECT pg_size_pretty(pg_relation_size('orders')) AS table_size,
       pg_size_pretty(pg_indexes_size('orders')) AS indexes_size;
```

:::tip Indexa lo que se busca
Un índice merece la pena en columnas por las que **se busca, se une o se ordena a menudo** y que distinguen bien unas filas de otras: claves foráneas, emails, fechas de pedido. No lo merece en una tabla de diez filas ni en una columna que casi nunca aparece en un `WHERE`.
:::

## Reto

::::challenge Búsqueda por apellido
El panel de soporte busca clientes por **apellido** constantemente. Crea un índice que permita hacerlo sin leer la tabla entera.

```sql verify
SELECT string_agg(a.attname, ', ' ORDER BY k.ord) AS indexed_columns
FROM pg_index AS i
CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
WHERE i.indrelid = 'customers'::regclass
GROUP BY i.indexrelid;
```

:::hint
`CREATE INDEX nombre ON tabla (columna);`
:::

:::solution
```sql
CREATE INDEX customers_last_name_idx ON customers (last_name);
```
La corrección comprueba qué columnas indexan los índices de `customers`: `id` (clave primaria), `email` (`UNIQUE`) y ahora `last_name`.
:::
::::

:::recap
- Sin índice, PostgreSQL lee la tabla entera (*Seq Scan*); con uno, va directo a las filas.
- Un índice B-tree guarda los valores ordenados con la ubicación de cada fila.
- PostgreSQL indexa solo las claves primarias y los `UNIQUE`; las claves foráneas y las columnas de búsqueda, no.
- Los índices ocupan espacio y hacen más lentas las escrituras: crea los que se usan.

En el siguiente paso aprenderás a preguntarle a PostgreSQL **cómo** va a ejecutar una consulta, con `EXPLAIN`.
:::
