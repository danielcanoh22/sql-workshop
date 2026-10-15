## Qué vas a aprender

Los datos casi nunca se muestran tal como están guardados: un precio se convierte en "económico" o "premium", un `NULL` en "Sin ciudad", una fecha en un mes, un nombre en minúsculas en "Ana García". Puedes hacerlo en la aplicación, pero muchas veces es más simple, y más rápido, hacerlo en la propia consulta.

- `CASE` para clasificar y ordenar con reglas propias, y agregaciones condicionales.
- `COALESCE` y `NULLIF` para tratar los `NULL`.
- Las funciones de texto que más se usan, y `string_agg` para juntar valores en una lista.
- Fechas e intervalos: sumar días, truncar al mes, extraer partes y formatear.
- Números: redondeo y la trampa de la división entera.
- Generar series de fechas para que un informe no se salte los meses sin datos.

## Requisitos previos

**Agregaciones y GROUP BY** y **JOINs**. En el último paso combinarás funciones con agrupaciones.

:::postgres Funciones de PostgreSQL
Las funciones de este tutorial son las de PostgreSQL. La mayoría existen con el mismo nombre (o uno parecido) en otras bases de datos, pero no todas: cuando una sea específica de PostgreSQL, lo verás indicado.
:::
