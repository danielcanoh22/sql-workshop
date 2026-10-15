## Objetivo del paso

Un índice puede tener **varias columnas**, y elegir bien cuáles y en qué orden es lo que separa un índice útil de uno que no se usa. En este paso aprendes:

1. Cómo está ordenado un índice de varias columnas, y por qué el orden importa.
2. A crear índices que sirven a la vez para filtrar y para ordenar.
3. Cuándo un índice sobra.

## Un índice de varias columnas

```sql
CREATE INDEX orders_customer_id_order_date_idx ON orders (customer_id, order_date);
```

:::concept Ordenado como una guía telefónica
El índice está ordenado primero por `customer_id` y, **dentro de cada cliente**, por `order_date`, igual que una guía telefónica está ordenada por apellido y, dentro de cada apellido, por nombre. Eso tiene dos consecuencias:

- Sirve para buscar por `customer_id`, y por `customer_id` **y** `order_date`.
- **No** sirve para buscar solo por `order_date`: los pedidos de una fecha están repartidos por todo el índice, como todos los "Juan" en una guía ordenada por apellido.

La regla: un índice de varias columnas sirve para condiciones sobre sus **primeras** columnas, de izquierda a derecha.
:::

:::tip ¿Qué columna va primero?
- Primero las columnas que se comparan con **igualdad** (`customer_id = 7`).
- Después, la que se usa para un **rango** u **ordenación** (`order_date >= ...`, `ORDER BY order_date`).
:::

## Filtrar y ordenar con el mismo índice

La pantalla "mis pedidos" muestra los 10 más recientes de un cliente: `WHERE customer_id = ? ORDER BY order_date DESC LIMIT 10`. Con un índice solo sobre `customer_id`, PostgreSQL encuentra **todos** los pedidos del cliente, los **ordena** y se queda con 10. Con `(customer_id, order_date)`, los pedidos del cliente ya están ordenados dentro del índice: lee los 10 últimos y para.

:::compare Los 10 pedidos más recientes de un cliente
La comparación añade 200 000 pedidos (unos 7 000 por cliente). La tienda ya tiene un índice sobre `orders (customer_id)`; la segunda variante añade uno sobre `(customer_id, order_date)`.

```sql setup
INSERT INTO orders (id, customer_id, order_date, status)
SELECT 1000 + g, 1 + g % 28, DATE '2000-01-01' + g / 28, 'delivered'
FROM generate_series(1, 200000) AS g;
ANALYZE orders;
```

```sql variant label="Índice sobre customer_id"
SELECT id, order_date
FROM orders
WHERE customer_id = 7
ORDER BY order_date DESC
LIMIT 10;
```
El índice encuentra los más de 7 000 pedidos del cliente, PostgreSQL los lee todos y los **ordena** (nodo *Sort*) para quedarse con 10.

```sql variant-setup
CREATE INDEX orders_customer_id_order_date_idx ON orders (customer_id, order_date);
```
```sql variant label="Índice sobre (customer_id, order_date)" best
SELECT id, order_date
FROM orders
WHERE customer_id = 7
ORDER BY order_date DESC
LIMIT 10;
```
El índice ya tiene los pedidos del cliente ordenados por fecha. PostgreSQL lo recorre **hacia atrás** desde el final del cliente 7, lee 10 entradas y se detiene. Sin *Sort*, y con el mismo coste tenga el cliente 10 pedidos o 10 millones.
:::

## Cuándo un índice sobra

- **Índices redundantes.** Con un índice sobre `(customer_id, order_date)`, el de solo `(customer_id)` es redundante: el compuesto sirve para lo mismo, porque `customer_id` es su primera columna. Mantener los dos es pagar dos veces en cada escritura.
- **Índices que nadie usa.** PostgreSQL cuenta cuántas veces se usa cada índice; en una base de datos real puedes consultarlo y borrar los que nunca se usan:

```sql run title="Cuántas veces se ha usado cada índice"
SELECT relname AS table_name, indexrelname AS index_name, idx_scan AS times_used
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

- **Tablas pequeñas** y columnas **poco selectivas**, como viste en el paso anterior.

:::postgres Más tipos de índices
PostgreSQL permite además índices **parciales** (solo sobre las filas que cumplen una condición, por ejemplo los pedidos pendientes), índices sobre **expresiones** (como `lower(email)`) y columnas extra con `INCLUDE` para conseguir *Index Only Scans*. Los verás en el tutorial de índices avanzados de la parte de PostgreSQL.
:::

## Reto

::::challenge Mis pedidos, rápido
La pantalla "mis pedidos" ejecuta, para el cliente que ha iniciado sesión:

```sql
SELECT id, order_date, status
FROM orders
WHERE customer_id = $1
ORDER BY order_date DESC
LIMIT 10;
```

Crea el índice que permite resolverla sin ordenar. No borres los índices existentes.

```sql verify
SELECT string_agg(a.attname, ', ' ORDER BY k.ord) AS indexed_columns
FROM pg_index AS i
CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
WHERE i.indrelid = 'orders'::regclass
GROUP BY i.indexrelid;
```

:::hint
Igualdad primero, ordenación después.
:::

:::solution
```sql
CREATE INDEX orders_customer_id_order_date_idx ON orders (customer_id, order_date);
```
`(order_date, customer_id)` no serviría: el índice estaría ordenado por fecha, con los pedidos de cada cliente repartidos por todo él. Y no hace falta declarar `order_date DESC`: un B-tree se puede recorrer en los dos sentidos.
:::
::::

:::recap
- Un índice de varias columnas está ordenado por la primera, después por la segunda dentro de la primera, y así sucesivamente.
- Sirve para condiciones sobre sus **primeras** columnas: igualdad primero, rango u orden después.
- Un índice que cubre el `WHERE` y el `ORDER BY` evita el *Sort* y permite parar en cuanto se alcanza el `LIMIT`.
- Un índice cuyas columnas son el principio de otro es redundante; los que nadie usa, sobran.

En el último paso decidirás qué índices necesita una aplicación a partir de sus consultas.
:::
