## Objetivo del paso

`NULL` es la fuente de errores más sutil de SQL: consultas que parecen correctas y devuelven menos filas de las que deberían, sin dar ningún error. En este paso aprendes:

1. Qué significa `NULL` (y qué no significa).
2. Por qué `= NULL` nunca funciona y cómo se pregunta de verdad: `IS NULL`.
3. Las dos trampas de `NULL` que más se ven en aplicaciones reales.

## Qué es `NULL`

Abre el panel **Datos** y mira la tabla `customers`: la columna `city` tiene la marca **NULL**, que indica que admite valores nulos. Tres clientes no tienen ciudad registrada.

:::concept NULL significa "desconocido"
`NULL` no es un cero, ni un texto vacío, ni un espacio. Es la **ausencia de valor**: no sabemos la ciudad de ese cliente. Y si no sabemos algo, cualquier comparación con ello tampoco se puede saber:

- ¿La ciudad desconocida es igual a `'Madrid'`? **Desconocido.**
- ¿La ciudad desconocida es distinta de `'Madrid'`? **Desconocido.**
- ¿Un valor desconocido es igual a otro valor desconocido? **Desconocido.**

Por eso SQL usa una **lógica de tres valores**: una condición puede ser verdadera, falsa o desconocida (`NULL`). Y `WHERE` solo deja pasar las filas donde la condición es **verdadera**.
:::

## `= NULL` nunca funciona

Esta consulta parece buscar a los clientes sin ciudad. Ejecútala:

```sql run title="El error clásico"
SELECT first_name, last_name, city
FROM customers
WHERE city = NULL;
```

**Cero filas**, y ningún error. `city = NULL` siempre da *desconocido*, para todas las filas, así que ninguna pasa el filtro. La forma correcta de preguntar es `IS NULL`:

```sql run title="Clientes sin ciudad"
SELECT first_name, last_name, city
FROM customers
WHERE city IS NULL;
```

Y su contrario, `IS NOT NULL`:

```sql run title="Clientes con ciudad"
SELECT first_name, last_name, city
FROM customers
WHERE city IS NOT NULL;
```

:::tip Regla de oro
Con `NULL` no se usa `=` ni `<>`: se usa **`IS NULL`** e **`IS NOT NULL`**.
:::

## Trampa 1: `<>` también descarta los `NULL`

Queremos a todos los clientes que **no** son de Madrid. Hay 30 clientes y 3 son de Madrid, así que esperamos 27:

```sql run title="¿Todos los que no son de Madrid?"
SELECT first_name, last_name, city
FROM customers
WHERE city <> 'Madrid';
```

Devuelve **24**. Faltan los tres clientes sin ciudad: para ellos `city <> 'Madrid'` es *desconocido*, no verdadero. Si de verdad los quieres incluir, tienes que pedirlo:

```sql run title="Incluyendo a los que no tienen ciudad"
SELECT first_name, last_name, city
FROM customers
WHERE city <> 'Madrid' OR city IS NULL;
```

:::postgres IS DISTINCT FROM
El estándar SQL (y PostgreSQL) tiene `IS DISTINCT FROM`, una comparación que trata `NULL` como un valor más: `city IS DISTINCT FROM 'Madrid'` es verdadero para los clientes sin ciudad. Es más corta, pero `<> ... OR ... IS NULL` deja la intención más clara a quien la lee, y funciona en cualquier base de datos.
:::

## Trampa 2: `NOT IN` con un `NULL` en la lista

```sql run title="Un NULL en la lista de NOT IN"
SELECT first_name, last_name, city
FROM customers
WHERE city NOT IN ('Madrid', NULL);
```

**Cero filas.** `NOT IN ('Madrid', NULL)` equivale a `city <> 'Madrid' AND city <> NULL`, y `city <> NULL` es siempre *desconocido*, así que el `AND` completo nunca llega a ser verdadero.

Escrito a mano parece un error tonto, pero en una aplicación pasa sin que nadie lo vea: la lista sale de una subconsulta o de una variable que, un día, trae un `NULL`. Lo retomarás en el tutorial de subconsultas, donde verás la alternativa segura (`NOT EXISTS`).

## Las operaciones con `NULL` dan `NULL`

Cualquier cálculo que involucra un `NULL` da `NULL`: `NULL + 1`, `NULL * 0` y también unir textos.

```sql run title="Unir un texto con NULL"
SELECT first_name || ' (' || city || ')' AS label
FROM customers
WHERE country = 'Chile';
```

*Diego* no tiene ciudad, y su etiqueta completa es `NULL`, no `Diego ()`. En el tutorial de expresiones verás `COALESCE`, que sirve para dar un valor por defecto cuando algo es `NULL`.

## Retos

::::challenge Clientes sin ciudad
El equipo de datos quiere completar la información que falta. Muestra el **nombre**, el **apellido** y el **país** de los clientes que **no tienen ciudad** registrada.

:::hint
No se usa `=`.
:::

:::solution
```sql
SELECT first_name, last_name, country
FROM customers
WHERE city IS NULL;
```
:::
::::

::::challenge Todos menos Madrid
Muestra el **nombre** y la **ciudad** de todos los clientes que **no son de Madrid**, incluidos los que no tienen ciudad registrada. Deberían salir 27.

:::hint
Con `city <> 'Madrid'` salen 24. ¿Qué filas faltan y por qué?
:::

:::hint
Añade con `OR` una condición que deje pasar las filas cuya ciudad es `NULL`.
:::

:::solution
```sql
SELECT first_name, city
FROM customers
WHERE city <> 'Madrid' OR city IS NULL;
```
`WHERE city IS DISTINCT FROM 'Madrid'` devuelve lo mismo y también se acepta.
:::
::::

::::challenge Colombianos activos con ciudad
Muestra el **nombre**, el **apellido** y la **ciudad** de los clientes de **Colombia** que están **activos** y **tienen ciudad** registrada.

:::hint
Son tres condiciones que se tienen que cumplir a la vez.
:::

:::solution
```sql
SELECT first_name, last_name, city
FROM customers
WHERE country = 'Colombia' AND is_active AND city IS NOT NULL;
```
:::
::::

:::recap
- `NULL` significa **desconocido**: no es cero ni texto vacío.
- Cualquier comparación con `NULL` da *desconocido*, y `WHERE` solo deja pasar lo **verdadero**.
- Se pregunta con `IS NULL` / `IS NOT NULL`, nunca con `= NULL`.
- `<>` descarta las filas con `NULL`: si las quieres, añade `OR columna IS NULL` (o usa `IS DISTINCT FROM`).
- Un `NULL` dentro de `NOT IN` hace que no pase **ninguna** fila.
- Los cálculos con `NULL` dan `NULL`.

En el último paso pondrás todo junto en retos que se parecen a lo que te pedirían en una aplicación real.
:::
