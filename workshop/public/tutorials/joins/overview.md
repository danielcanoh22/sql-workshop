## Qué vas a aprender

Un pedido guarda `customer_id = 7`, no "Sofía Díaz". Así lo quiere el modelo relacional: cada dato vive en un solo sitio. Pero la pantalla de pedidos tiene que mostrar el nombre del cliente. Para juntar datos de varias tablas en un mismo resultado están los **JOINs**, probablemente lo más importante que vas a aprender de SQL.

- `INNER JOIN`: combinar filas que se corresponden en dos tablas.
- Alias de tabla y columnas calificadas, y el error de "columna ambigua".
- `LEFT JOIN`: conservar las filas que no tienen pareja, y encontrar lo que **no** existe (clientes sin pedidos, productos sin ventas).
- La trampa de filtrar en `WHERE` después de un `LEFT JOIN`.
- Unir tres y cuatro tablas, incluidas las relaciones de muchos a muchos.
- Combinar JOINs con `GROUP BY`, y por qué las claves foráneas necesitan un índice, comprobado con 200 000 pedidos.

## Requisitos previos

**El modelo relacional** (claves primarias y foráneas) y **Agregaciones y GROUP BY**. Abre el diagrama del panel **Datos**: cada flecha es un JOIN que vas a escribir.

:::tip RIGHT, FULL y NATURAL JOIN
Este tutorial se centra en `INNER JOIN` y `LEFT JOIN`, que cubren la inmensa mayoría de las consultas reales. Al final verás por qué los demás tipos casi no se usan en el código de una aplicación.
:::
