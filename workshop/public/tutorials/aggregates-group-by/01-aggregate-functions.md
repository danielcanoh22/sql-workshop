## Objetivo del paso

Una función de agregación toma **muchas filas** y devuelve **un solo valor**. En este paso aprendes:

1. Las cinco funciones de agregación que usarás a diario.
2. La diferencia entre `COUNT(*)`, `COUNT(columna)` y `COUNT(DISTINCT columna)`.
3. Cómo tratan los `NULL`.

## De muchas filas a un valor

```sql run title="¿Cuántos clientes tenemos?"
SELECT count(*) AS customers
FROM customers;
```

Una sola fila con un solo valor: 30. La consulta **recorrió** las 30 filas, pero en lugar de devolverlas, las **resumió**.

| Función | Devuelve |
| --- | --- |
| `count(*)` | Cuántas filas hay |
| `sum(x)` | La suma de los valores |
| `avg(x)` | La media |
| `min(x)` / `max(x)` | El menor / el mayor valor (también con textos y fechas) |

Puedes combinar varias en la misma consulta, y con `WHERE` eliges qué filas se resumen:

```sql run title="Resumen de los productos de Electrónica"
SELECT count(*) AS products,
       min(price) AS cheapest,
       max(price) AS most_expensive,
       sum(stock) AS units_in_stock
FROM products
WHERE category_id = 1;
```

:::concept Primero WHERE, después la agregación
`WHERE` se evalúa **antes** de agregar: primero se eligen las filas (los productos de Electrónica) y después se resumen. Por eso el `count(*)` de arriba cuenta solo 6 productos, no 30.
:::

## `avg` y los decimales

```sql run title="Precio medio"
SELECT avg(price) AS raw_average,
       round(avg(price), 2) AS average
FROM products;
```

`avg` de una columna `numeric` devuelve un `numeric` con muchos decimales. En una aplicación casi siempre lo redondearás con `round(..., 2)`.

## Los `NULL` no cuentan

Las funciones de agregación **ignoran los `NULL`**. Eso hace que `count` tenga tres formas con significados distintos:

```sql run title="Tres formas de contar"
SELECT count(*) AS all_rows,
       count(city) AS with_city,
       count(DISTINCT city) AS distinct_cities
FROM customers;
```

| Forma | Cuenta |
| --- | --- |
| `count(*)` | **Filas**, tengan lo que tengan |
| `count(city)` | Filas donde `city` **no es `NULL`** |
| `count(DISTINCT city)` | **Valores distintos** de `city` (sin contar `NULL`) |

30 clientes, 27 con ciudad (3 no la tienen), 23 ciudades distintas (Madrid, Buenos Aires y Lima se repiten).

:::warning avg también ignora los NULL
Si una columna `rating` tiene los valores `5`, `3` y `NULL`, `avg(rating)` es **4** (la media de 5 y 3), no 2.67. Normalmente es lo que quieres (las valoraciones que faltan no deberían contar como ceros), pero tenlo presente: un `NULL` no es un cero.
:::

## Sin filas que resumir

¿Qué devuelve una agregación cuando el `WHERE` no deja pasar ninguna fila?

```sql run title="Resumir cero filas"
SELECT count(*) AS products, sum(stock) AS units
FROM products
WHERE category_id = 99;
```

`count` devuelve **0**, pero `sum` devuelve **`NULL`** (la suma de "nada" no es un número). Si en tu aplicación quieres un 0, lo convertirás con `COALESCE`, que verás en el tutorial de expresiones.

## Retos

::::challenge Clientes y ciudades
Muestra en una sola fila tres columnas: el **número de clientes**, cuántos tienen **ciudad registrada** y cuántas **ciudades distintas** hay.

:::hint
Necesitas tres formas distintas de `count`.
:::

:::solution
```sql
SELECT count(*) AS customers,
       count(city) AS with_city,
       count(DISTINCT city) AS distinct_cities
FROM customers;
```
:::
::::

::::challenge Resumen de precios
Muestra el **precio más barato**, el **más caro** y el **precio medio redondeado a dos decimales** de todos los productos.

:::hint
`min`, `max` y `avg`, este último dentro de `round(..., 2)`.
:::

:::solution
```sql
SELECT min(price) AS cheapest,
       max(price) AS most_expensive,
       round(avg(price), 2) AS average_price
FROM products;
```
:::
::::

::::challenge Lo que se ha vendido
En la tabla `order_items` cada línea tiene una cantidad (`quantity`) y un precio unitario (`unit_price`). Muestra en una fila las **unidades vendidas en total** y el **importe total vendido** (cantidad por precio de cada línea, sumado), redondeado a dos decimales.

:::hint
Puedes agregar expresiones: `sum(quantity * unit_price)` multiplica en cada fila y después suma.
:::

:::solution
```sql
SELECT sum(quantity) AS units,
       round(sum(quantity * unit_price), 2) AS revenue
FROM order_items;
```
452 unidades y 22 206.82 en total. Esta cifra incluye los pedidos cancelados; filtrarlos requiere mirar el estado en `orders`, algo que harás con los JOINs.
:::
::::

:::recap
- Una **función de agregación** resume muchas filas en un valor: `count`, `sum`, `avg`, `min`, `max`.
- `WHERE` elige las filas **antes** de agregarlas.
- Las agregaciones **ignoran los `NULL`**: `count(*)` cuenta filas, `count(columna)` valores no nulos y `count(DISTINCT columna)` valores distintos.
- Sobre cero filas, `count` devuelve 0 y las demás devuelven `NULL`.

En el siguiente paso dejarás de resumir la tabla entera: calcularás un resumen **por cada grupo** (por país, por estado, por categoría).
:::
