## Objetivo del paso

Tres informes de un panel de administración, cada uno combinando varias funciones del tutorial con lo que ya sabes de JOINs y agrupaciones. Constrúyelos poco a poco: primero los datos, después las transformaciones.

## Retos

::::challenge Antigüedad de los clientes
Muestra el **nombre** de cada cliente y cuántos **días** llevaba registrado el **31 de diciembre de 2025** (`days`). Ordena de más antiguo a más reciente y, a igualdad, por id.

:::hint
Restar dos fechas da el número de días: `DATE '2025-12-31' - signup_date`.
:::

:::solution
```sql ordered
SELECT first_name, DATE '2025-12-31' - signup_date AS days
FROM customers
ORDER BY days DESC, id;
```
Usar una fecha fija en lugar de `current_date` hace que el informe dé siempre el mismo resultado; en una aplicación usarías `current_date`.
:::
::::

::::challenge Resumen de estados
Muestra, para cada estado de pedido, su **nombre en español** (`Pendiente`, `Pagado`, `Enviado`, `Entregado`, `Cancelado`), el **número de pedidos** y el **importe total** de sus líneas, redondeado a dos decimales. Ordena en el orden del proceso: pendiente, pagado, enviado, entregado y cancelado.

:::hint
Une `orders` con `order_items` y agrupa por `o.status`.
:::

:::hint
El nombre en español es un `CASE status WHEN ... END`, y el orden otro `CASE` en el `ORDER BY`. Cuidado al contar pedidos: cada pedido aparece una vez por línea.
:::

:::solution
```sql ordered
SELECT CASE o.status
         WHEN 'pending' THEN 'Pendiente'
         WHEN 'paid' THEN 'Pagado'
         WHEN 'shipped' THEN 'Enviado'
         WHEN 'delivered' THEN 'Entregado'
         ELSE 'Cancelado'
       END AS status,
       count(DISTINCT o.id) AS orders,
       round(sum(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY o.status
ORDER BY CASE o.status
           WHEN 'pending' THEN 1
           WHEN 'paid' THEN 2
           WHEN 'shipped' THEN 3
           WHEN 'delivered' THEN 4
           ELSE 5
         END;
```
`count(DISTINCT o.id)` es la clave: el JOIN con las líneas multiplica las filas, y `count(*)` contaría líneas, no pedidos.
:::
::::

::::challenge Segmentos de clientes
Clasifica a **todos** los clientes según lo que han gastado (sin contar pedidos cancelados): `'oro'` desde 1000, `'plata'` desde 500 y `'bronce'` por debajo, incluidos los que no han gastado nada. Muestra el **nombre completo** (`first_name` y `last_name` separados por espacio), el **gasto** (0 si no han comprado nada, redondeado a dos decimales) y el **segmento**. Ordena del que más gastó al que menos y, a igualdad, por id.

:::hint
Empieza por una CTE con el gasto de cada cliente que tiene pedidos no cancelados. Después, `customers` con un `LEFT JOIN` a esa CTE.
:::

:::hint
`COALESCE(s.spent, 0)` convierte en 0 el gasto de quien no tiene pedidos. Úsalo tanto en la columna del gasto como dentro del `CASE`.
:::

:::solution
```sql ordered
WITH spending AS (
  SELECT o.customer_id, sum(oi.quantity * oi.unit_price) AS spent
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
)
SELECT c.first_name || ' ' || c.last_name AS full_name,
       round(COALESCE(s.spent, 0), 2) AS spent,
       CASE
         WHEN COALESCE(s.spent, 0) >= 1000 THEN 'oro'
         WHEN COALESCE(s.spent, 0) >= 500 THEN 'plata'
         ELSE 'bronce'
       END AS segment
FROM customers AS c
LEFT JOIN spending AS s ON s.customer_id = c.id
ORDER BY COALESCE(s.spent, 0) DESC, c.id;
```
Este informe junta casi todo el nivel Intermedio: una CTE, un `LEFT JOIN` para no perder a nadie, `COALESCE` para los que no compraron, `CASE` para clasificar y un orden determinista.
:::
::::

:::recap
En este tutorial has aprendido a transformar datos en la consulta:

- `CASE` para clasificar, traducir y definir órdenes propios; `FILTER` para agregaciones condicionales.
- `COALESCE` y `NULLIF` para tratar `NULL` y divisiones por cero.
- Funciones de texto, `concat_ws` y `string_agg`.
- Aritmética de fechas, `EXTRACT`, `date_trunc`, `to_char` y `generate_series` para informes sin huecos.
- La división entera y el redondeo.
- Funciones en el `SELECT` y el `GROUP BY`, sí; sobre la columna de un `WHERE`, no.

En el siguiente tutorial entenderás por fin qué es un **índice**, cómo leer un plan de ejecución con `EXPLAIN` y cómo decidir qué indexar.
:::
