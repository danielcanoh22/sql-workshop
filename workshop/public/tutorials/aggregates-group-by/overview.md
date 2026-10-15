## Qué vas a aprender

Hasta ahora cada fila del resultado era una fila de la tabla. Pero muchas preguntas de una aplicación no piden filas, piden **resúmenes**: ¿cuántos clientes tenemos?, ¿cuánto vendimos?, ¿cuántos pedidos hay en cada estado? Para eso están las **funciones de agregación** y `GROUP BY`.

- Contar, sumar, promediar y buscar máximos y mínimos: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.
- Cómo tratan los `NULL` las funciones de agregación (y por qué `COUNT(*)` y `COUNT(columna)` no son lo mismo).
- Agrupar con `GROUP BY` y la regla que evita el error más común al agrupar.
- Filtrar grupos con `HAVING` y la diferencia con `WHERE`.
- El orden completo en que PostgreSQL evalúa una consulta.

## Requisitos previos

**SELECT y WHERE** y **Ordenar y paginar**. Todavía trabajarás con una sola tabla a la vez: cuando un resultado muestre un `customer_id` o un `product_id` en lugar de un nombre, es porque unir tablas es el tema del siguiente tutorial, **JOINs**.
