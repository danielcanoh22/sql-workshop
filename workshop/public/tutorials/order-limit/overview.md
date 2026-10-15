## Qué vas a aprender

Cualquier listado de una aplicación (productos, pedidos, resultados de búsqueda) tiene dos cosas en común: un **orden** y una **página**. Nadie muestra diez mil productos de golpe, y nadie quiere verlos en un orden aleatorio. En este tutorial aprendes a hacer ambas cosas bien.

- Ordenar con `ORDER BY`: varias columnas, ascendente y descendente, expresiones y dónde van los `NULL`.
- Por qué un orden **determinista** es imprescindible para paginar.
- Quedarte con las primeras filas con `LIMIT` y paginar con `OFFSET`.
- Por qué `OFFSET` se vuelve lento en tablas grandes y cómo lo resuelve la **paginación por clave** (*keyset*), comprobándolo con 100 000 filas.

## Requisitos previos

El tutorial **SELECT y WHERE**: aquí se combinan `ORDER BY` y `LIMIT` con los filtros que ya conoces.

:::tip Ahora el orden sí importa
En SELECT y WHERE los retos aceptaban las filas en cualquier orden. Aquí la corrección **también comprueba el orden** de las filas cuando el reto lo pide.
:::
