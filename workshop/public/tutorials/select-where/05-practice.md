## Objetivo del paso

Hora de juntar todo. Estos retos están sacados de pantallas típicas de una tienda online: el catálogo, el buscador del panel de administración, un informe de calidad de datos. Antes de cada uno, piensa qué columnas necesitas, de qué tabla salen y qué condiciones deben cumplir las filas.

Y al final, una última comparación sobre algo que harás cientos de veces: buscar un registro por un campo único.

## Retos

::::challenge El catálogo de la tienda
La página del catálogo muestra el **nombre** y el **precio** de los productos que se pueden comprar: los que están **a la venta** (`is_active`), tienen **stock** y cuestan **entre 10 y 60**, ambos incluidos.

:::hint
Son tres condiciones unidas con `AND`. Una de ellas no necesita comparación porque la columna es booleana.
:::

:::hint
"Tener stock" es `stock > 0`. Para el precio, `BETWEEN` incluye los dos extremos.
:::

:::solution
```sql
SELECT name, price
FROM products
WHERE is_active AND stock > 0 AND price BETWEEN 10 AND 60;
```
Fíjate en que el catálogo no muestra *Rayuela* ni *Bufanda de lana* (sin stock) ni la *Webcam HD* (no está a la venta), aunque su precio esté en el rango.
:::
::::

::::challenge Buscador de clientes
En el panel de administración, alguien escribe `mar` en el buscador de clientes. Muestra el **nombre** y el **apellido** de los clientes cuyo **nombre o apellido empieza** por ese texto, **sin distinguir mayúsculas**.

:::hint
"Empieza por" es un patrón con `%` solo al final.
:::

:::hint
Necesitas `ILIKE` dos veces, una por columna, unidas con `OR`.
:::

:::solution
```sql
SELECT first_name, last_name
FROM customers
WHERE first_name ILIKE 'mar%' OR last_name ILIKE 'mar%';
```
Aparecen *Marta López*, *Martín Rojas* y *Luis Martínez* (por el apellido). En la aplicación, `mar` llegaría como parámetro: `first_name ILIKE $1 || '%'`.
:::
::::

::::challenge Informe de calidad de datos
El equipo de datos quiere revisar los clientes que se dieron de alta **en 2024** y tienen algún problema: **no tienen ciudad** registrada **o no están activos**. Muestra su **nombre**, **apellido**, **ciudad** y si están activos (`is_active`).

:::hint
Hay un `OR` (sin ciudad o inactivo) y un `AND` (dados de alta en 2024). Recuerda la precedencia.
:::

:::hint
Escribe el año 2024 como rango semiabierto: `signup_date >= '2024-01-01' AND signup_date < '2025-01-01'`. Y la ciudad desconocida se pregunta con `IS NULL`.
:::

:::solution
```sql
SELECT first_name, last_name, city, is_active
FROM customers
WHERE (city IS NULL OR NOT is_active)
  AND signup_date >= '2024-01-01'
  AND signup_date < '2025-01-01';
```
Este reto combina las tres ideas importantes del tutorial: `IS NULL` en lugar de `= NULL`, paréntesis al mezclar `AND` con `OR`, y un rango semiabierto para el periodo, que deja la columna libre de funciones.
:::
::::

::::challenge Reponer stock
El almacén necesita saber qué productos de **Hogar** (categoría 3) o **Ropa** (categoría 5) están **agotados**. Muestra su **nombre** y su **categoría**.

:::hint
"Agotado" es `stock = 0`. Las categorías se pueden escribir con `IN`.
:::

:::solution
```sql
SELECT name, category_id
FROM products
WHERE stock = 0 AND category_id IN (3, 5);
```
Con `IN` no hacen falta paréntesis: `category_id IN (3, 5)` ya es una sola condición. Escrito con `OR`, tendrías que agruparlo: `stock = 0 AND (category_id = 3 OR category_id = 5)`.
:::
::::

## Buscar un registro por un campo único

El login de una aplicación busca al usuario por su email cientos de veces por minuto. La columna `email` es `UNIQUE`, y PostgreSQL crea automáticamente un **índice** para garantizar esa unicidad. ¿Lo aprovechan todas las formas de escribir la búsqueda?

:::compare Buscar un cliente por email
La comparación añade 50 000 clientes de prueba y busca a uno de ellos.

```sql setup
INSERT INTO customers (first_name, last_name, email, country, signup_date)
SELECT 'Cliente', 'Prueba ' || g, 'cliente' || g || '@example.com', 'España', DATE '2024-01-01'
FROM generate_series(1, 50000) AS g;
ANALYZE customers;
```

```sql variant label="Función sobre la columna"
SELECT id, first_name, last_name
FROM customers
WHERE lower(email) = 'cliente4242@example.com';
```
`lower(email)` se calcula para **cada fila** antes de comparar, así que el índice de `email` no sirve: PostgreSQL lee la tabla completa. Se suele escribir así "por si el usuario tecleó mayúsculas", pero el coste lo paga cada búsqueda.

```sql variant label="Comparación directa" best
SELECT id, first_name, last_name
FROM customers
WHERE email = 'cliente4242@example.com';
```
La columna está "desnuda", así que PostgreSQL usa el índice único y va directo a la fila: unas pocas páginas en lugar de cientos. Para que las mayúsculas no sean un problema, la aplicación **guarda los emails ya normalizados** (en minúsculas) y normaliza también lo que escribe el usuario antes de buscar.
:::

:::tip Si de verdad necesitas buscar con una función
A veces no puedes normalizar los datos. PostgreSQL permite crear un **índice sobre una expresión**, por ejemplo `CREATE INDEX ON customers (lower(email))`, y entonces `WHERE lower(email) = ...` sí lo usa. Lo verás en el tutorial de índices.
:::

:::recap
En este tutorial has aprendido a pedir exactamente los datos que necesitas:

- `SELECT` con **las columnas por su nombre** (nunca `SELECT *` en una aplicación), alias y columnas calculadas; `DISTINCT` para quitar repetidos.
- `WHERE` para filtrar filas: comparaciones, fechas en formato ISO, booleanos, y **paréntesis** al mezclar `AND` y `OR`.
- `IN`, `BETWEEN`, `LIKE` e `ILIKE` para listas, rangos y búsquedas de texto.
- `NULL` es *desconocido*: se pregunta con `IS NULL`, y cuidado con `<>` y `NOT IN`.
- Los filtros **sargables** (columna sin funciones, rangos semiabiertos) pueden usar índices, y la diferencia se mide en páginas leídas.
- Los valores que escribe el usuario viajan como **parámetros**, nunca pegados a la consulta.

En el siguiente tutorial aprenderás a **ordenar** los resultados con `ORDER BY` y a **paginarlos**, que es lo que hace cualquier listado de una aplicación.
:::
