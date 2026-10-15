## Objetivo del paso

Hay filtros que aparecen en todas las aplicaciones: "uno de estos valores", "entre esto y aquello", "que contenga este texto". SQL tiene operadores específicos para ellos. En este paso aprendes:

1. `IN` y `NOT IN` para listas de valores.
2. `BETWEEN` para rangos, y por qué con fechas conviene otra forma.
3. `LIKE` e `ILIKE` para buscar texto.
4. A escribir filtros que **pueden usar un índice**, y a comprobarlo.

## `IN`: uno de varios valores

En el paso anterior escribiste `category_id = 2 OR category_id = 6`. Con `IN` queda más corto y se lee mejor:

```sql run title="Libros y juguetes"
SELECT name, category_id
FROM products
WHERE category_id IN (2, 6);
```

`NOT IN` hace lo contrario: la fila pasa si el valor **no** está en la lista.

```sql run title="Clientes fuera de España y México"
SELECT first_name, last_name, country
FROM customers
WHERE country NOT IN ('España', 'México');
```

## `BETWEEN`: rangos

`BETWEEN a AND b` equivale a `>= a AND <= b`. **Incluye los dos extremos**:

```sql run title="Productos entre 20 y 50"
SELECT name, price
FROM products
WHERE price BETWEEN 20 AND 50;
```

:::warning BETWEEN y las fechas
Con columnas de tipo `date` (solo día), `signup_date BETWEEN '2024-03-01' AND '2024-03-31'` funciona. Pero muchas columnas de una aplicación son **marcas de tiempo** (`timestamp`), con hora. Con ellas, `BETWEEN '2024-03-01' AND '2024-03-31'` **deja fuera casi todo el 31 de marzo**, porque `'2024-03-31'` significa "31 de marzo a las 00:00:00".

La forma robusta, que funciona igual con fechas y con marcas de tiempo, es el **rango semiabierto**: mayor o igual que el inicio y **menor estricto** que el día siguiente al final.

```sql
WHERE signup_date >= '2024-03-01' AND signup_date < '2024-04-01'
```

Acostúmbrate a escribir los rangos de fechas así.
:::

```sql run title="Altas del primer trimestre de 2024"
SELECT first_name, last_name, signup_date
FROM customers
WHERE signup_date >= '2024-01-01' AND signup_date < '2024-04-01';
```

## `LIKE`: buscar texto

`LIKE` compara un texto con un **patrón** que admite dos comodines:

| Comodín | Significa | Ejemplo | Coincide con |
| --- | --- | --- | --- |
| `%` | cualquier cantidad de caracteres (incluso ninguno) | `'Ca%'` | *Cafetera italiana*, *Cargador USB-C* |
| `_` | exactamente un carácter | `'_uis'` | *Luis* |

```sql run title="Productos que empiezan por Ca"
SELECT name
FROM products
WHERE name LIKE 'Ca%';
```

```sql run title="Productos que contienen 'de'"
SELECT name
FROM products
WHERE name LIKE '%de%';
```

`LIKE` distingue mayúsculas: `'%juego%'` no encuentra *Juego de mesa familiar*. Para un buscador eso es un problema.

:::postgres ILIKE
PostgreSQL tiene `ILIKE`, que funciona igual que `LIKE` pero **sin distinguir mayúsculas**. No es SQL estándar (en otras bases de datos se suele escribir `lower(name) LIKE '%juego%'`), pero en PostgreSQL es la forma habitual.

```sql
WHERE name ILIKE '%juego%'
```
:::

:::tip El coste de buscar "lo que contenga"
Un patrón que **empieza** por un texto fijo (`'Ca%'`) se puede resolver con un índice adecuado. Un patrón que **empieza** por `%` (`'%juego%'`) obliga a revisar todas las filas. Para tablas pequeñas da igual; para buscar en millones de filas, PostgreSQL ofrece herramientas específicas (índices de trigramas o búsqueda de texto completo) que verás más adelante.
:::

## Filtros que pueden usar un índice

Un **índice** es como el índice alfabético de un libro: permite ir directo a las filas que buscas sin leer la tabla entera. Los verás en detalle en su propio tutorial, pero hay una regla que conviene aprender desde el primer `WHERE`:

:::concept Deja la columna "desnuda"
Si aplicas una función o una operación **a la columna** en el `WHERE` (por ejemplo `EXTRACT(YEAR FROM signup_date) = 2024`), PostgreSQL tiene que calcular esa función **para cada fila** antes de comparar, y el índice sobre `signup_date` no le sirve. Si en cambio comparas la columna tal cual con valores fijos (`signup_date >= '2024-01-01'`), puede usar el índice. A los filtros que pueden usar un índice se les llama **sargables**.
:::

Compruébalo. La comparación crea 100 000 clientes de prueba y un índice sobre `signup_date`, y busca los que se dieron de alta en **marzo de 2024** de tres formas distintas:

:::compare Clientes dados de alta en marzo de 2024
```sql setup
INSERT INTO customers (first_name, last_name, email, country, signup_date)
SELECT 'Cliente', 'Prueba ' || g, 'prueba' || g || '@example.com', 'España', DATE '2023-01-01' + g / 100
FROM generate_series(1, 100000) AS g;
CREATE INDEX customers_signup_date_idx ON customers (signup_date);
ANALYZE customers;
```

```sql variant label="Función sobre la columna"
SELECT id, first_name
FROM customers
WHERE EXTRACT(YEAR FROM signup_date) = 2024 AND EXTRACT(MONTH FROM signup_date) = 3;
```
`EXTRACT` se calcula **en cada una de las 100 000 filas**: PostgreSQL lee la tabla completa (*Seq Scan*) y descarta casi todo. El índice existe, pero no se puede usar porque la condición no es sobre `signup_date`, sino sobre un cálculo hecho con ella.

```sql variant label="BETWEEN"
SELECT id, first_name
FROM customers
WHERE signup_date BETWEEN '2024-03-01' AND '2024-03-31';
```
La columna está "desnuda", así que PostgreSQL usa el índice y lee solo la parte de la tabla que contiene marzo. Funciona porque `signup_date` es de tipo `date`; con una marca de tiempo perdería casi todo el día 31.

```sql variant label="Rango semiabierto" best
SELECT id, first_name
FROM customers
WHERE signup_date >= '2024-03-01' AND signup_date < '2024-04-01';
```
Tan eficiente como `BETWEEN` y además correcto para cualquier tipo de fecha u hora. Es la forma recomendada de filtrar por un periodo.
:::

Abre **Ver plan de ejecución** en cada variante: en la primera verás un filtro que descarta decenas de miles de filas; en las otras, una **condición de índice**.

## Retos

::::challenge Clientes de la región andina
Muestra el **nombre**, el **apellido** y el **país** de los clientes de **Perú, Colombia o Ecuador**.

:::hint
Una lista de valores posibles se escribe con `IN (...)`. Los textos van entre comillas simples y llevan la tilde tal como está en los datos: `'Perú'`.
:::

:::solution
```sql
SELECT first_name, last_name, country
FROM customers
WHERE country IN ('Perú', 'Colombia', 'Ecuador');
```
:::
::::

::::challenge Productos de precio medio
Muestra el **nombre** y el **precio** de los productos que cuestan **entre 20 y 50, ambos incluidos**.

:::hint
`BETWEEN` incluye los dos extremos.
:::

:::solution
```sql
SELECT name, price
FROM products
WHERE price BETWEEN 20 AND 50;
```
Equivale a `WHERE price >= 20 AND price <= 50`. Con números (y con columnas `date`) `BETWEEN` es perfectamente válido.
:::
::::

::::challenge Buscador de productos
Un usuario escribe `juego` en el buscador de la tienda. Muestra el **nombre** y el **precio** de los productos cuyo nombre **contiene** ese texto, **sin distinguir mayúsculas**.

:::hint
"Contiene" significa que puede haber cualquier cosa antes y después: `%` a ambos lados.
:::

:::hint
`LIKE` distingue mayúsculas. En PostgreSQL, `ILIKE` no.
:::

:::solution
```sql
SELECT name, price
FROM products
WHERE name ILIKE '%juego%';
```
Encuentra *Juego de sartenes* y *Juego de mesa familiar*. En la aplicación real, el texto `juego` llegaría como **parámetro** (`ILIKE '%' || $1 || '%'`), nunca pegado a la consulta.
:::
::::

::::challenge Altas del primer trimestre
Muestra el **nombre**, el **apellido** y la **fecha de alta** de los clientes que se dieron de alta en el **primer trimestre de 2024** (enero, febrero y marzo). Escribe el filtro como un **rango semiabierto**.

:::hint
El trimestre empieza el `'2024-01-01'` y termina justo antes del `'2024-04-01'`.
:::

:::solution
```sql
SELECT first_name, last_name, signup_date
FROM customers
WHERE signup_date >= '2024-01-01' AND signup_date < '2024-04-01';
```
Así no tienes que pensar cuántos días tiene marzo, y el filtro seguiría siendo correcto si mañana la columna pasara a guardar también la hora.
:::
::::

::::challenge Fuera de Electrónica y Libros
Muestra el **nombre** y la **categoría** (`category_id`) de los productos que **no** son de Electrónica (1) **ni** de Libros (2).

:::hint
Es lo contrario de `IN`.
:::

:::solution
```sql
SELECT name, category_id
FROM products
WHERE category_id NOT IN (1, 2);
```
Ten cuidado con `NOT IN` cuando la lista o la columna pueden contener `NULL`: el resultado puede sorprenderte. Lo verás en el siguiente paso.
:::
::::

:::recap
- `IN (a, b, c)` sustituye a una cadena de `OR`; `NOT IN` es su contrario.
- `BETWEEN a AND b` incluye ambos extremos. Para periodos de tiempo usa el **rango semiabierto** `>= inicio AND < fin`.
- `LIKE` busca patrones con `%` (cualquier cosa) y `_` (un carácter); `ILIKE` no distingue mayúsculas (PostgreSQL).
- Para que un filtro pueda usar un índice, deja **la columna sin funciones** y compárala con valores fijos.

En el siguiente paso conocerás a `NULL`, el valor que no es igual a nada, ni siquiera a sí mismo.
:::
