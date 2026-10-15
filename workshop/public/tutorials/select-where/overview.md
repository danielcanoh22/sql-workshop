## Qué vas a aprender

Leer datos es lo que más hace una aplicación: listar productos, buscar un cliente, mostrar los pedidos pendientes. Todo eso es `SELECT`. En este tutorial aprendes a pedirle a la base de datos **exactamente** los datos que necesitas: las columnas justas y solo las filas que cumplen una condición.

Trabajarás sobre la base de datos de una **tienda online**: clientes, categorías, productos, pedidos y líneas de pedido. Es un PostgreSQL real que corre en tu navegador, así que todo lo que escribas se ejecuta de verdad.

- Escribir consultas `SELECT ... FROM ...` eligiendo columnas, con alias y columnas calculadas.
- Filtrar filas con `WHERE`: comparaciones, texto, fechas y booleanos.
- Combinar condiciones con `AND`, `OR` y `NOT` sin caer en la trampa de la precedencia.
- Buscar con `IN`, `BETWEEN`, `LIKE` e `ILIKE`.
- Entender `NULL` y por qué `= NULL` nunca funciona.
- Escribir filtros que **pueden usar índices**, y comprobar la diferencia con tus propios ojos.

## Cómo funciona el workshop

:::tip Todo es interactivo
- Los bloques **Pruébalo** tienen un botón **Ejecutar** (o `Ctrl + Enter`). Puedes editar la consulta tanto como quieras; **Restaurar** vuelve al código original.
- Los **retos** se comprueban solos: escribe tu respuesta y pulsa **Comprobar**. Se acepta cualquier consulta que devuelva el resultado correcto, no solo la de la solución. Usa las pistas antes de mirar la solución.
- Los bloques **Compara** ejecutan varias formas de resolver lo mismo y te muestran cuánto trabajo hizo PostgreSQL con cada una.
- El botón **Datos** abre un panel con las tablas, sus columnas, sus filas y un diagrama de relaciones. Se actualiza solo después de cada consulta.
:::

:::warning Puedes romper lo que quieras
Si borras o modificas datos mientras experimentas, abre el panel **Datos** y pulsa **Restablecer**: la base de datos vuelve a su estado original. Los retos y las comparaciones siempre se ejecutan sobre una copia limpia, así que tus cambios nunca afectan a la corrección.
:::

## Requisitos previos

Ninguno. Este es el punto de partida: no necesitas haber escrito SQL antes. Si ya hiciste el tutorial **El modelo relacional**, reconocerás las tablas y las claves; si no, te bastará con mirar el diagrama del panel **Datos**.
