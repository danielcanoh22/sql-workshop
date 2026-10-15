## Objetivo del paso

Vas a transformar textos en la consulta. Al terminar sabrás:

1. Cambiar mayúsculas, medir, recortar y reemplazar textos.
2. Extraer una parte de un texto (por ejemplo, el usuario de un email).
3. Unir textos sin que un `NULL` lo estropee todo.
4. Juntar los valores de varias filas en una lista con `string_agg`.

## Las funciones básicas

```sql run title="Funciones de texto habituales"
SELECT name,
       upper(name) AS upper_name,
       lower(name) AS lower_name,
       length(name) AS characters,
       left(name, 10) AS first_ten,
       replace(name, ' ', '-') AS slug
FROM products
WHERE category_id = 2;
```

| Función | Hace | Ejemplo |
| --- | --- | --- |
| `upper`, `lower` | Mayúsculas / minúsculas | `lower('Ana')` → `ana` |
| `initcap` | Primera letra de cada palabra en mayúscula | `initcap('ana garcía')` → `Ana García` |
| `length` | Número de caracteres | `length('Rayuela')` → `7` |
| `trim` | Quita espacios al principio y al final | `trim('  hola ')` → `hola` |
| `left`, `right` | Los primeros / últimos `n` caracteres | `left('Madrid', 3)` → `Mad` |
| `substring` | Un trozo desde una posición | `substring('Madrid' FROM 2 FOR 3)` → `adr` |
| `replace` | Sustituye un texto por otro | `replace('a-b', '-', '+')` → `a+b` |
| `position` | Posición de un texto dentro de otro | `position('@' IN 'ana@x.com')` → `4` |

:::tip Normaliza al guardar, no al buscar
En **SELECT y WHERE** viste que `WHERE lower(email) = ...` impide usar el índice. Las funciones de texto en el `SELECT` no tienen ese problema. Y para que las búsquedas no necesiten `lower`, normaliza los datos **al guardarlos** (`trim` y `lower` del email antes del `INSERT`).
:::

## Partir un texto

`split_part(texto, separador, n)` devuelve el trozo número `n` (desde 1) tras partir el texto por el separador. El usuario y el dominio de un email:

```sql run title="Usuario y dominio de cada email"
SELECT email,
       split_part(email, '@', 1) AS username,
       split_part(email, '@', 2) AS domain
FROM customers
LIMIT 5;
```

## Unir textos con `NULL`

`||` devuelve `NULL` si cualquiera de las partes es `NULL`. `concat_ws` (*concat with separator*) **ignora** los `NULL`:

```sql run title="|| frente a concat_ws"
SELECT first_name,
       city || ', ' || country AS with_pipes,
       concat_ws(', ', city, country) AS with_concat_ws
FROM customers
WHERE country = 'Chile';
```

Para *Diego*, que no tiene ciudad, `||` da `NULL` y `concat_ws` da simplemente `Chile`, sin una coma suelta.

## Juntar filas en una lista: `string_agg`

`string_agg` es una función de **agregación** que une los valores de un grupo en un solo texto:

```sql run title="Los productos de cada categoría, en una línea"
SELECT c.name AS category,
       string_agg(p.name, ', ' ORDER BY p.name) AS products
FROM categories AS c
JOIN products AS p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
```

`ORDER BY` dentro de `string_agg` decide el orden de los elementos de la lista; sin él, el orden no está garantizado.

:::postgres string_agg
`string_agg` es de PostgreSQL. En otras bases de datos se llama `GROUP_CONCAT` (MySQL) o `LISTAGG` (Oracle).
:::

## Retos

::::challenge Usuario del email
Muestra el **email** de cada cliente y, en una columna `username`, la parte **anterior a la arroba**.

:::solution
```sql
SELECT email, split_part(email, '@', 1) AS username
FROM customers;
```
:::
::::

::::challenge Iniciales
Muestra para cada cliente una columna `initials` con la **inicial del nombre** y la **inicial del apellido**, en mayúsculas (por ejemplo, `AG` para Ana García).

:::hint
`left(texto, 1)` devuelve el primer carácter.
:::

:::solution
```sql
SELECT upper(left(first_name, 1) || left(last_name, 1)) AS initials
FROM customers;
```
:::
::::

::::challenge Ubicación sin comas sueltas
Muestra el **nombre** de cada cliente y una columna `location` con su ciudad y su país separados por coma y espacio (`Madrid, España`). Si no tiene ciudad, solo el país (`Chile`), sin coma.

:::hint
Una función que une con separador e ignora los `NULL`.
:::

:::solution
```sql
SELECT first_name, concat_ws(', ', city, country) AS location
FROM customers;
```
:::
::::

::::challenge Clientes por país, en una línea
Muestra cada **país** y, en una columna `customers`, los **nombres** de sus clientes separados por coma y espacio, **ordenados alfabéticamente**. Ordena los países alfabéticamente.

:::solution
```sql ordered
SELECT country, string_agg(first_name, ', ' ORDER BY first_name) AS customers
FROM customers
GROUP BY country
ORDER BY country;
```
:::
::::

:::recap
- `upper`, `lower`, `initcap`, `length`, `trim`, `left`, `substring`, `replace` y `position` cubren la mayoría de las transformaciones de texto.
- `split_part` parte un texto por un separador.
- `||` propaga los `NULL`; `concat_ws` los ignora.
- `string_agg(valor, separador ORDER BY ...)` junta los valores de un grupo en un texto.
- Normaliza los textos al guardarlos para que las búsquedas no necesiten funciones.

En el siguiente paso trabajarás con fechas y números.
:::
