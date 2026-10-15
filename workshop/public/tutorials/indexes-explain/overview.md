## Qué vas a aprender

A lo largo del workshop has visto comparaciones en las que una consulta leía cientos de páginas y otra cuatro. La diferencia casi siempre era un **índice**. En este tutorial entiendes qué son, cómo los usa PostgreSQL y, sobre todo, **cómo decidir qué indexar**: la habilidad que más rendimiento aporta a una aplicación con datos de verdad.

- Qué es un índice, qué cuesta y qué índices crea PostgreSQL solo.
- Leer un plan de ejecución con `EXPLAIN` y `EXPLAIN ANALYZE`.
- Por qué PostgreSQL a veces **ignora** un índice, y hace bien.
- Índices de varias columnas: el orden importa, y pueden evitar ordenar.
- Cuándo **no** crear un índice.

## Requisitos previos

El nivel Principiante completo. Ayuda haber hecho las comparaciones de **SELECT y WHERE**, **JOINs** y **Ordenar y paginar**: aquí verás por qué salieron como salieron.

:::tip Datos grandes
Con las 30 filas de la tienda, PostgreSQL no necesita índices: leer la tabla entera es instantáneo. Por eso muchos ejemplos de este tutorial empiezan generando decenas de miles de filas. Si el panel **Datos** se llena de clientes de prueba, **Restablecer** lo deja como al principio.
:::
