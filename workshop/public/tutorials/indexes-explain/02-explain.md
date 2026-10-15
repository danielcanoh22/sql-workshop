## Objetivo del paso

`EXPLAIN` le pregunta a PostgreSQL **cómo** piensa ejecutar una consulta. Es la herramienta para entender por qué una consulta es lenta. Al terminar sabrás:

1. La diferencia entre `EXPLAIN` y `EXPLAIN ANALYZE`.
2. Leer los nodos más habituales de un plan.
3. Por qué PostgreSQL a veces decide **no** usar un índice que existe.

## Preparar datos

Ejecuta este bloque primero: crea 100 000 clientes, casi todos de España y un 1 % de Uruguay, y un índice sobre `country`.

```sql run title="100 000 clientes y un índice sobre country"
INSERT INTO customers (id, first_name, last_name, email, country, signup_date)
SELECT 1000 + g, 'Cliente', 'Prueba ' || g, 'prueba' || g || '@example.com',
       CASE WHEN g % 100 = 0 THEN 'Uruguay' ELSE 'España' END,
       DATE '2024-01-01' + g % 365
FROM generate_series(1, 100000) AS g;

CREATE INDEX customers_country_idx ON customers (country);

ANALYZE customers;
```

`ANALYZE` actualiza las **estadísticas** de la tabla: cuántas filas tiene y cómo se reparten sus valores. El planificador las usa para decidir. PostgreSQL las actualiza solo de vez en cuando; después de una carga grande conviene lanzarlo a mano.

## `EXPLAIN`: el plan, sin ejecutar

```sql run title="El plan para los clientes de Uruguay"
EXPLAIN
SELECT id, first_name
FROM customers
WHERE country = 'Uruguay';
```

El resultado es un **árbol de nodos**: cuando hay varios, los más indentados se ejecutan primero y pasan sus filas al de arriba. Aquí hay uno solo:

```text
Index Scan using customers_country_idx on customers  (cost=0.29..148.15 rows=990 width=11)
  Index Cond: (country = 'Uruguay'::text)
```

- `Index Scan using customers_country_idx`: usará el índice para encontrar las filas.
- `rows=990`: cuántas filas **estima** que saldrán, gracias a las estadísticas (en realidad son 1 000: estimar no es contar).
- `cost=inicio..total`: una estimación del trabajo en unidades internas. No son milisegundos; sirven para comparar planes entre sí.

## Los nodos que más vas a ver

| Nodo | Qué hace | Cuándo |
| --- | --- | --- |
| `Seq Scan` | Lee la tabla entera | Sin índice útil, o cuando se van a leer muchas filas |
| `Index Scan` | Recorre el índice y va a cada fila | Pocas filas |
| `Index Only Scan` | Responde solo con el índice, sin ir a la tabla | El índice contiene todas las columnas pedidas |
| `Bitmap Heap Scan` + `Bitmap Index Scan` | Marca en el índice las páginas con coincidencias y las lee en orden | Bastantes filas, repartidas |
| `Nested Loop`, `Hash Join`, `Merge Join` | Formas de unir tablas | JOINs |
| `Sort`, `Aggregate`, `Limit` | Ordenar, agrupar, cortar | `ORDER BY`, `GROUP BY`, `LIMIT` |

## Cuando PostgreSQL ignora el índice

Ahora los clientes de España, que son el 99 %:

```sql run title="El plan para los clientes de España"
EXPLAIN
SELECT id, first_name
FROM customers
WHERE country = 'España';
```

*Seq Scan*, aunque el índice existe. ¿Es un error? No.

:::concept La selectividad
Usar un índice tiene un coste por fila: buscar en el índice y saltar a la tabla, a páginas desordenadas. Si la consulta va a devolver **casi toda la tabla**, leerla de principio a fin es más rápido que hacer 99 000 saltos. El planificador compara el coste estimado de cada opción y elige el menor. Un índice es útil para condiciones **selectivas**, que se quedan con una parte pequeña de las filas.
:::

Por eso indexar columnas con pocos valores distintos (un booleano, un estado con tres valores repartidos a partes iguales) rara vez sirve para filtrar por ellas solas.

## `EXPLAIN ANALYZE`: el plan, ejecutándolo

`EXPLAIN ANALYZE` **ejecuta** la consulta y añade lo que pasó de verdad:

```sql run title="Estimación frente a realidad"
EXPLAIN ANALYZE
SELECT id, first_name
FROM customers
WHERE country = 'Uruguay';
```

Ahora cada nodo muestra también `actual time=… rows=… loops=…`. La comparación más útil es **`rows` estimadas frente a `rows` reales**: si son muy distintas, el planificador decidió con información equivocada (estadísticas viejas: lanza `ANALYZE`).

:::warning EXPLAIN ANALYZE ejecuta de verdad
Con un `SELECT` no pasa nada, pero `EXPLAIN ANALYZE UPDATE ...` o `DELETE ...` **modifica los datos**. Para analizarlos sin consecuencias, hazlo dentro de una transacción y deshazla: `BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;`.
:::

:::postgres BUFFERS
`EXPLAIN (ANALYZE, BUFFERS)` añade cuántas páginas de 8 kB se leyeron (`shared hit` = estaban en memoria, `read` = del disco). Es exactamente la métrica de **páginas leídas** que muestran las comparaciones del workshop, y la mejor para comparar dos consultas sin depender de la máquina.
:::

## Reto

::::challenge Leer un plan
Una consulta de la aplicación tarda varios segundos. Este es su `EXPLAIN ANALYZE` (resumido):

```text
Sort  (actual rows=12 loops=1)
  Sort Key: order_date DESC
  ->  Seq Scan on orders  (rows=4 actual rows=12 loops=1)
        Filter: (customer_id = 4815)
        Rows Removed by Filter: 2399988
```

¿Qué está haciendo PostgreSQL? ¿Qué es lo que más trabajo cuesta? ¿Qué cambiarías?

:::hint
Fíjate en `Rows Removed by Filter` y en el tipo de nodo que lee `orders`.
:::

:::solution
PostgreSQL **lee los 2,4 millones de pedidos** (*Seq Scan*), descarta 2 399 988 que no son del cliente 4815 y ordena los 12 que quedan. Casi todo el trabajo está en esa lectura completa: `Rows Removed by Filter` enorme frente a muy pocas filas devueltas es la señal clásica de que **falta un índice**.

La solución es un índice sobre `orders (customer_id)` (es una clave foránea: debería existir desde el principio). Mejor aún, uno sobre `(customer_id, order_date)`, que además entrega las filas ya ordenadas y evita el `Sort`, como verás en el siguiente paso.

También llama la atención la estimación: `rows=4` frente a 12 reales. No es grave aquí, pero diferencias grandes indican estadísticas desactualizadas.
:::
::::

:::recap
- `EXPLAIN` muestra el plan estimado; `EXPLAIN ANALYZE` ejecuta la consulta y muestra lo que pasó de verdad.
- Nodos clave: `Seq Scan`, `Index Scan`, `Index Only Scan`, `Bitmap Heap Scan`, los tres tipos de JOIN, `Sort`, `Aggregate`, `Limit`.
- El planificador elige por **coste estimado**, con las estadísticas que actualiza `ANALYZE`.
- Un índice solo ayuda en condiciones **selectivas**; para devolver casi toda la tabla, el *Seq Scan* es mejor.
- `Rows Removed by Filter` alto con pocas filas devueltas = falta un índice.

En el siguiente paso verás los índices de varias columnas y cómo pueden ahorrar también la ordenación.
:::
