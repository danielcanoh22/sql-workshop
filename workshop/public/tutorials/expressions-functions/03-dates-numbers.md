## Objetivo del paso

Fechas y números aparecen en todos los informes. En este paso aprendes:

1. Aritmética con fechas: sumar días, intervalos y diferencias.
2. Extraer partes de una fecha, truncarla al mes y formatearla.
3. Generar una serie de fechas para que un informe no se salte los meses sin datos.
4. Redondear y evitar la trampa de la **división entera**.

## Fechas e intervalos

```sql run title="Aritmética con fechas"
SELECT current_date AS today,
       current_date + 7 AS in_a_week,
       current_date - DATE '2025-01-01' AS days_since_new_year,
       now() - INTERVAL '2 hours' AS two_hours_ago,
       DATE '2025-01-31' + INTERVAL '1 month' AS one_month_later;
```

- A una `date` le puedes sumar o restar **días** (un entero), y restar dos fechas da un número de días.
- Un `INTERVAL` expresa duraciones: `'2 hours'`, `'30 days'`, `'1 month'`. Fíjate en que el 31 de enero más un mes es el **28 de febrero**: PostgreSQL ajusta al último día del mes.
- `current_date` es el día de hoy; `now()` es el instante actual (fecha y hora con zona horaria).

## Partes de una fecha, el mes y el formato

```sql run title="Extraer, truncar y formatear"
SELECT order_date,
       EXTRACT(YEAR FROM order_date) AS year,
       EXTRACT(ISODOW FROM order_date) AS weekday,
       date_trunc('month', order_date)::date AS month,
       to_char(order_date, 'DD/MM/YYYY') AS formatted
FROM orders
ORDER BY id
LIMIT 5;
```

| Función | Devuelve |
| --- | --- |
| `EXTRACT(campo FROM fecha)` | Una parte como número: `YEAR`, `MONTH`, `DAY`, `ISODOW` (1 = lunes … 7 = domingo) |
| `date_trunc('month', fecha)` | El inicio del mes (también `'week'`, `'year'`, `'day'`…); devuelve un `timestamptz`, por eso `::date` |
| `to_char(fecha, formato)` | Un texto con el formato que pidas: `'YYYY-MM'`, `'DD/MM/YYYY'` |

:::postgres Formatear en la base de datos o en la aplicación
`to_char` es útil en informes y exportaciones. En una aplicación con usuarios de varios países, suele ser mejor devolver la fecha tal cual y formatearla en la interfaz, según el idioma de cada usuario. (El PostgreSQL del workshop solo tiene los nombres de los meses en inglés.)
:::

## Agrupar por mes

`date_trunc` es la forma habitual de agrupar por periodo:

```sql run title="Ventas por mes"
SELECT date_trunc('month', o.order_date)::date AS month,
       round(sum(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month
ORDER BY month;
```

## Los meses que faltan

Un informe de pedidos **cancelados** por mes tiene un problema: los meses sin cancelaciones **no aparecen**, porque no hay filas que agrupar. Un gráfico construido con ese resultado se saltaría meses. `generate_series` crea la lista completa de meses, y un `LEFT JOIN` la completa con los datos:

```sql run title="Cancelaciones de cada mes de 2025, también los meses sin ninguna"
SELECT month::date AS month,
       count(o.id) AS cancelled
FROM generate_series(DATE '2025-01-01', DATE '2025-12-01', INTERVAL '1 month') AS month
LEFT JOIN orders AS o
  ON o.status = 'cancelled'
 AND o.order_date >= month
 AND o.order_date < month + INTERVAL '1 month'
GROUP BY month
ORDER BY month;
```

:::concept Una tabla que no existe
`generate_series(inicio, fin, paso)` es una función que devuelve **filas**: se usa en el `FROM` como si fuera una tabla. Con números (`generate_series(1, 10)`) también sirve para generar datos de prueba, como hacen las comparaciones del workshop. La condición del `LEFT JOIN` es un **rango semiabierto**, así que puede usar un índice sobre `order_date`.
:::

## Números y la división entera

```sql run title="La trampa de la división entera"
SELECT 7 / 2 AS integer_division,
       7 / 2.0 AS decimal_division,
       7::numeric / 2 AS with_cast,
       7 % 2 AS remainder;
```

Entre **enteros**, `/` descarta los decimales: `7 / 2` es **3**. Es un error muy común al calcular porcentajes con `count(*)`, que devuelve un entero. Convierte uno de los dos a `numeric` (o usa `100.0`) antes de dividir. Para redondear: `round(x, 2)`, `ceil(x)` (hacia arriba) y `floor(x)` (hacia abajo).

## Truncar fechas en el `WHERE`

`date_trunc` es perfecta para **agrupar**, pero en un **filtro** tiene el mismo problema que `EXTRACT` en **SELECT y WHERE**: se calcula en cada fila y el índice no sirve.

:::compare Los pedidos de marzo de 2025
La comparación añade 200 000 pedidos de 2023 a 2025 y un índice sobre `order_date`, y busca los de marzo de 2025.

```sql setup
INSERT INTO orders (id, customer_id, order_date, status)
SELECT 1000 + g, 1 + g % 28, DATE '2023-01-01' + g / 183, 'delivered'
FROM generate_series(1, 200000) AS g;
CREATE INDEX orders_order_date_idx ON orders (order_date);
ANALYZE orders;
```

```sql variant label="date_trunc en el filtro"
SELECT id, order_date
FROM orders
WHERE date_trunc('month', order_date) = '2025-03-01';
```
`date_trunc` se calcula para cada uno de los 200 000 pedidos antes de comparar: lectura completa de la tabla.

```sql variant label="Rango del mes" best
SELECT id, order_date
FROM orders
WHERE order_date >= '2025-03-01' AND order_date < '2025-04-01';
```
El mismo mes expresado como rango semiabierto: la columna está "desnuda" y PostgreSQL usa el índice. Regla de siempre: funciones en el `SELECT` y en el `GROUP BY` sí; sobre la columna del `WHERE`, no.
:::

## Retos

::::challenge Ventas por mes
Muestra el **mes** (como fecha del primer día del mes) y el **importe vendido** en ese mes, **redondeado a dos decimales**, sin contar pedidos cancelados. Ordena por mes.

:::hint
`date_trunc('month', o.order_date)::date` y una suma de `quantity * unit_price` agrupada por ese valor.
:::

:::solution
```sql ordered
SELECT date_trunc('month', o.order_date)::date AS month,
       round(sum(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month
ORDER BY month;
```
:::
::::

::::challenge Pedidos por día de la semana
Muestra el **día de la semana** (1 = lunes … 7 = domingo) y el **número de pedidos** de cada día, ordenado por día.

:::solution
```sql ordered
SELECT EXTRACT(ISODOW FROM order_date) AS weekday, count(*) AS orders
FROM orders
GROUP BY weekday
ORDER BY weekday;
```
:::
::::

::::challenge Porcentaje de clientes activos
Muestra el **porcentaje de clientes activos**, con **un decimal** (por ejemplo, `90.0`).

:::hint
Cuidado: `count(*)` es un entero. Si divides dos enteros, pierdes los decimales.
:::

:::hint
`round(100.0 * count(*) FILTER (WHERE is_active) / count(*), 1)`.
:::

:::solution
```sql
SELECT round(100.0 * count(*) FILTER (WHERE is_active) / count(*), 1) AS active_percent
FROM customers;
```
Con `100 * ... / count(*)` entre enteros también saldría 90 aquí (27 × 100 / 30 es exacto), pero en cuanto el resultado no fuera exacto perderías los decimales. Multiplicar por `100.0` convierte la operación a decimal desde el principio.
:::
::::

::::challenge Un calendario sin huecos
Muestra **todos los meses de 2025** (como fecha del primer día) y el **número de pedidos cancelados** de cada uno, incluidos los meses **sin ninguno** (con 0). Ordena por mes.

:::hint
Parte de `generate_series(DATE '2025-01-01', DATE '2025-12-01', INTERVAL '1 month')` y une los pedidos cancelados con un `LEFT JOIN` por rango de fechas.
:::

:::solution
```sql ordered
SELECT month::date AS month,
       count(o.id) AS cancelled
FROM generate_series(DATE '2025-01-01', DATE '2025-12-01', INTERVAL '1 month') AS month
LEFT JOIN orders AS o
  ON o.status = 'cancelled'
 AND o.order_date >= month
 AND o.order_date < month + INTERVAL '1 month'
GROUP BY month
ORDER BY month;
```
Fíjate en `count(o.id)`: como aprendiste en **JOINs**, con `count(*)` los meses sin cancelaciones saldrían con 1.
:::
::::

:::recap
- A una fecha se le suman días; los `INTERVAL` expresan duraciones; restar fechas da días.
- `EXTRACT` saca partes de una fecha, `date_trunc` la lleva al inicio del periodo y `to_char` la formatea.
- `generate_series` crea filas (números o fechas) para completar informes con huecos.
- Entre enteros, `/` descarta los decimales: convierte a `numeric` antes de dividir.
- Funciones sobre fechas en el `SELECT` y el `GROUP BY`, sí; en la columna de un `WHERE`, usa rangos.

En el último paso combinarás todas estas funciones en un informe de clientes.
:::
