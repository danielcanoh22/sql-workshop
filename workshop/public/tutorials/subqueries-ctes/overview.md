## Qué vas a aprender

Algunas preguntas necesitan una respuesta intermedia: "los productos más caros **que la media**" exige calcular primero la media. Las **subconsultas** permiten usar el resultado de una consulta dentro de otra, y las **CTEs** (`WITH`) permiten darles un nombre para escribir consultas largas que se leen de arriba abajo.

- Subconsultas que devuelven un valor, en `WHERE` y en `SELECT`.
- Subconsultas **correlacionadas**, que se evalúan por cada fila, y cuándo son un problema de rendimiento.
- `IN`, `EXISTS` y `NOT EXISTS`, y por qué `NOT IN` con una subconsulta es una trampa.
- CTEs con `WITH` para dividir una consulta compleja en pasos con nombre.
- Subconsultas en el `FROM` (tablas derivadas) y el clásico "el último de cada grupo".

## Requisitos previos

El nivel **Principiante** completo, en especial **Agregaciones y GROUP BY** y **JOINs**: casi todas las subconsultas de este tutorial agregan o unen tablas.
