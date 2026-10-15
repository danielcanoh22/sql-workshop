## Objetivo del paso

Estos retos reproducen listados reales de la tienda. En cada uno decide: qué filas (`WHERE`), en qué orden (`ORDER BY`, con desempate si hace falta) y cuántas (`LIMIT`, `OFFSET` o paginación por clave).

## Retos

::::challenge Catálogo con los agotados al final
La tienda muestra los productos **a la venta** (`is_active`) ordenados por **nombre**, pero con los **agotados** (stock 0) **al final** de la lista. Muestra **nombre** y **stock**.

:::hint
Ordena primero por una expresión que separe los agotados de los demás, y después por nombre.
:::

:::hint
`stock = 0` es falso para los que tienen stock, y `false` va antes que `true`.
:::

:::solution
```sql ordered
SELECT name, stock
FROM products
WHERE is_active
ORDER BY stock = 0, name;
```
En la tienda hay dos productos activos sin stock (*Bufanda de lana* y *Rayuela*): aparecen al final, también ordenados por nombre entre ellos.
:::
::::

::::challenge Pedidos pendientes más antiguos
El equipo de logística atiende primero los pedidos **pendientes** más antiguos. Muestra el **id** y la **fecha** de los **5 primeros** que deben atender: estado `'pending'`, del más antiguo al más reciente y, a igual fecha, por id.

:::solution
```sql ordered
SELECT id, order_date
FROM orders
WHERE status = 'pending'
ORDER BY order_date, id
LIMIT 5;
```
:::
::::

::::challenge Clientes de España, página 2
El panel de administración lista los clientes de **España** por **fecha de alta** (y por id para desempatar), **4 por página**. Muestra el **nombre** y la **fecha de alta** de la **página 2**.

:::hint
Página 2 con 4 por página: `OFFSET 4`.
:::

:::solution
```sql ordered
SELECT first_name, signup_date
FROM customers
WHERE country = 'España'
ORDER BY signup_date, id
LIMIT 4 OFFSET 4;
```
Para un listado tan pequeño, `OFFSET` es perfectamente razonable: la paginación por clave brilla cuando hay miles de páginas.
:::
::::

::::challenge Los más caros de cada pantalla
En la ficha de una categoría se muestran los **2 productos más caros**. Para la categoría **Hogar** (id 3), muestra **nombre** y **precio**, del más caro al más barato.

:::solution
```sql ordered
SELECT name, price
FROM products
WHERE category_id = 3
ORDER BY price DESC
LIMIT 2;
```
:::
::::

:::recap
En este tutorial has aprendido a ordenar y paginar como lo hace una aplicación real:

- `ORDER BY` con varias columnas, `ASC`/`DESC`, expresiones y `NULLS FIRST`/`NULLS LAST`.
- El orden debe ser **determinista**: termina con una columna única cuando haya posibles empates.
- `LIMIT` siempre con `ORDER BY`; `OFFSET` para páginas, con la fórmula `(n - 1) * size`.
- La **paginación por clave** mantiene constante el coste de cada página, y la diferencia se mide en filas y páginas leídas.

En el siguiente tutorial pasarás de listar filas a **resumirlas**: contar, sumar y agrupar con `GROUP BY`.
:::
